const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper to check if a message can be edited (within 5 seconds)
const canEditMessage = (createdAt) => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return diffMs <= 5000; // 5 seconds
};

// @route   GET /api/chat/unread
// @desc    Get unread chat count
// @access  Private
router.get('/unread', protect, async (req, res) => {
  try {
    if (req.user.role === 'client') {
      const adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        return res.json({ unreadCount: 0 });
      }
      const unreadCount = await Message.countDocuments({
        sender: adminUser._id,
        recipient: req.user._id,
        isRead: false
      });
      return res.json({ unreadCount });
    } else {
      const unreadCount = await Message.countDocuments({
        recipient: req.user._id,
        isRead: false
      });
      return res.json({ unreadCount });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching unread chat count' });
  }
});

// @route   GET /api/chat/clients
// @desc    Get all clients with last message and unread count (Admin only)
// @access  Private/Admin
router.get('/clients', protect, admin, async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' }).select('-password -plainPassword');
    const adminUser = req.user;

    const formattedClients = await Promise.all(
      clients.map(async (client) => {
        // Find last message between this client and admin
        const lastMsg = await Message.findOne({
          $or: [
            { sender: adminUser._id, recipient: client._id },
            { sender: client._id, recipient: adminUser._id }
          ]
        }).sort({ createdAt: -1 });

        // Count unread messages from client to admin
        const unreadCount = await Message.countDocuments({
          sender: client._id,
          recipient: adminUser._id,
          isRead: false
        });

        return {
          id: client._id,
          name: client.name,
          email: client.email,
          company: client.company,
          phone: client.phone,
          photoUrl: client.photoUrl,
          isLiveWorking: client.isLiveWorking ?? false,
          chatDisabled: client.chatDisabled ?? false,
          lastMessage: lastMsg ? {
            text: lastMsg.text,
            imageUrl: lastMsg.imageUrl,
            createdAt: lastMsg.createdAt
          } : null,
          unreadCount
        };
      })
    );

    return res.json({ data: formattedClients });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching clients for chat' });
  }
});

// @route   GET /api/chat/history/:clientId
// @desc    Get message history between user and another user
// @access  Private
router.get('/history/:clientId', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    let partnerId = req.params.clientId;

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    if (req.user.role === 'client') {
      // Clients can only chat with admin
      partnerId = adminUser._id;
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.json({ data: [] });
    }

    // Fetch message history: (sender is user, recipient is partner) OR (sender is partner, recipient is user) OR (recipient is null - broadcasts)
    // For broadcasts, we also include them so client receives them.
    const filterQuery = {
      $or: [
        { sender: userId, recipient: partnerId },
        { sender: partnerId, recipient: userId },
        { recipient: null }
      ]
    };

    // If client is requesting, hide deleted messages
    if (req.user.role === 'client') {
      filterQuery.isDeleted = { $ne: true };
    }

    const messages = await Message.find(filterQuery).sort({ createdAt: 1 }).populate('sender', 'name role');

    // Mark messages sent by partner to user as read
    if (req.user.role === 'admin') {
      await Message.updateMany(
        { sender: partnerId, recipient: userId, isRead: false },
        { isRead: true }
      );
    } else {
      await Message.updateMany(
        { sender: adminUser._id, recipient: userId, isRead: false },
        { isRead: true }
      );
    }

    // Add canEdit field dynamically based on 5 second rule
    const formatted = messages.map(m => {
      const msgObj = m.toObject();
      return {
        id: msgObj._id,
        sender: msgObj.sender,
        recipient: msgObj.recipient,
        text: msgObj.text,
        imageUrl: msgObj.imageUrl,
        isRead: msgObj.isRead,
        edited: msgObj.edited,
        isDeleted: msgObj.isDeleted || false,
        createdAt: msgObj.createdAt,
        canEdit: canEditMessage(msgObj.createdAt)
      };
    });

    return res.json({ data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching chat history' });
  }
});

// @route   POST /api/chat/send
// @desc    Send a text message / image message / broadcast / multi-recipient
// @access  Private
router.post('/send', protect, async (req, res) => {
  const { recipientId, text, imageUrl } = req.body;
  const userId = req.user._id;
  const isClient = req.user.role === 'client';

  try {
    // Check if client's chat is disabled by admin
    if (isClient) {
      const clientUser = await User.findById(userId);
      if (clientUser?.chatDisabled) {
        return res.status(403).json({ error: 'Chat has been disabled by admin. Please contact support.' });
      }
    }

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Clients always send directly to the admin (removes broadcast/multi-select checks)
    const activeRecipient = isClient ? adminUser._id.toString() : recipientId;

    const io = req.app.get('socketio');

    // Case 1: Send to multiple selected clients (Admin only)
    if (Array.isArray(activeRecipient)) {
      if (isClient) {
        return res.status(403).json({ error: 'Clients cannot send messages to multiple users.' });
      }

      const messages = await Promise.all(
        activeRecipient.map(async (cId) => {
          const newMsg = await Message.create({
            sender: userId,
            recipient: cId,
            text: text || '',
            imageUrl: imageUrl || null
          });

          const populated = await Message.findById(newMsg._id).populate('sender', 'name role');

          // Send real-time Socket.IO notification to client
          if (io) {
            io.to(cId.toString()).emit('new_message', populated);
          }

          // Create notification item
          await Notification.create({
            user: cId,
            title: `New message from Admin`,
            message: text || 'Sent an image attachment',
            category: 'chat'
          });

          return populated;
        })
      );

      return res.status(201).json({ success: true, data: messages });
    }

    // Case 2: Broadcast to all clients (Admin only, activeRecipient === null or "broadcast")
    if ((activeRecipient === null || activeRecipient === 'broadcast') && !isClient) {
      if (isClient) {
        return res.status(403).json({ error: 'Clients cannot send broadcast messages.' });
      }

      const newMsg = await Message.create({
        sender: userId,
        recipient: null,
        text: text || '',
        imageUrl: imageUrl || null
      });

      const populated = await Message.findById(newMsg._id).populate('sender', 'name role');

      // Send real-time Socket.IO notification to all clients
      if (io) {
        io.emit('new_message', populated);
      }

      // Add notification for all clients
      const clients = await User.find({ role: 'client' });
      await Promise.all(
        clients.map(async (client) => {
          await Notification.create({
            user: client._id,
            title: `Broadcast message from Admin`,
            message: text || 'Broadcasted an image',
            category: 'chat'
          });
        })
      );

      return res.status(201).json({ success: true, data: populated });
    }

    // Case 3: One-to-one standard chat message
    const finalRecipient = activeRecipient;

    const newMsg = await Message.create({
      sender: userId,
      recipient: finalRecipient,
      text: text || '',
      imageUrl: imageUrl || null
    });

    const populated = await Message.findById(newMsg._id).populate('sender', 'name role');

    // Send real-time Socket.IO notification
    if (io) {
      io.to(finalRecipient.toString()).emit('new_message', populated);
      io.to(userId.toString()).emit('new_message', populated); // Send to sender's other tabs
    }

    // Notify partner
    await Notification.create({
      user: finalRecipient,
      title: isClient ? `New message from ${req.user.name}` : `New message from Admin`,
      message: text || 'Sent an image attachment',
      category: 'chat'
    });

    return res.status(201).json({ success: true, data: populated });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error sending message' });
  }
});

// @route   PUT /api/chat/edit/:messageId
// @desc    Edit message text within 5 seconds
// @access  Private
router.post('/edit/:messageId', protect, async (req, res) => {
  const { text } = req.body;
  const messageId = req.params.messageId;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized to edit this message' });
    }

    // Check 5 second rule
    if (!canEditMessage(message.createdAt)) {
      return res.status(400).json({ error: 'Time limit to edit message has expired (5 seconds).' });
    }

    message.text = text || '';
    message.edited = true;
    await message.save();

    const populated = await Message.findById(message._id).populate('sender', 'name role');
    const io = req.app.get('socketio');

    // Broadcast edit event
    if (io) {
      if (message.recipient) {
        io.to(message.recipient.toString()).emit('message_edited', populated);
        io.to(message.sender.toString()).emit('message_edited', populated);
      } else {
        io.emit('message_edited', populated); // Broadcast
      }
    }

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error editing message' });
  }
});

// @route   DELETE /api/chat/delete/:messageId
// @desc    Delete message (Admin only or sender for their own messages)
// @access  Private
router.post('/delete/:messageId', protect, async (req, res) => {
  const messageId = req.params.messageId;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Permission checks: Clients can delete their own messages by setting isDeleted = true
    if (req.user.role === 'client') {
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized to delete this message.' });
      }
      message.isDeleted = true;
      await message.save();
    } else {
      // Admin deletes completely
      await Message.findByIdAndDelete(messageId);
    }

    const io = req.app.get('socketio');
    if (io) {
      if (message.recipient) {
        io.to(message.recipient.toString()).emit('message_deleted', { messageId });
        io.to(message.sender.toString()).emit('message_deleted', { messageId });
      } else {
        io.emit('message_deleted', { messageId });
      }
    }

    return res.json({ success: true, messageId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error deleting message' });
  }
});

// @route   POST /api/chat/clear/:clientId
// @desc    Admin clears all chat messages with a specific client
// @access  Private/Admin
router.post('/clear/:clientId', protect, admin, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const adminId = req.user._id;
    
    await Message.deleteMany({
      $or: [
        { sender: adminId, recipient: clientId },
        { sender: clientId, recipient: adminId }
      ]
    });
    
    return res.json({ success: true, message: 'Chat cleared successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error clearing chat' });
  }
});

// @route   POST /api/chat/toggle-live/:clientId
// @desc    Admin toggles isLiveWorking status for a client
// @access  Private/Admin
router.post('/toggle-live/:clientId', protect, admin, async (req, res) => {
  try {
    const client = await User.findById(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    client.isLiveWorking = !client.isLiveWorking;
    await client.save();
    
    return res.json({ success: true, isLiveWorking: client.isLiveWorking });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error toggling live status' });
  }
});

// @route   POST /api/chat/toggle-chat/:clientId
// @desc    Admin toggles chatDisabled status for a client
// @access  Private/Admin
router.post('/toggle-chat/:clientId', protect, admin, async (req, res) => {
  try {
    const client = await User.findById(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    client.chatDisabled = !client.chatDisabled;
    await client.save();
    
    return res.json({ success: true, chatDisabled: client.chatDisabled });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error toggling chat status' });
  }
});

// @route   GET /api/chat/client-status
// @desc    Get isLiveWorking and chatDisabled status for current client user
// @access  Private
router.get('/client-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('isLiveWorking chatDisabled');
    return res.json({ isLiveWorking: user?.isLiveWorking ?? false, chatDisabled: user?.chatDisabled ?? false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching client status' });
  }
});

module.exports = router;
