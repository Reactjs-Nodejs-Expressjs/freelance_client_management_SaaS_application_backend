const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Notification = require('../models/Notification');

// @route   GET /api/messages
// @desc    Get messages/inbox notifications for client
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id, category: { $ne: 'chat' } }).sort({ createdAt: -1 });
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false, category: { $ne: 'chat' } });

    // Map title -> subject for inbox UI compatibility
    const formatted = notifications.map(n => ({
      id: n._id,
      subject: n.title,
      message: n.message,
      isRead: n.isRead,
      category: n.category,
      createdAt: n.createdAt
    }));

    return res.json({ messages: formatted, unreadCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching client messages' });
  }
});

// @route   POST /api/messages
// @desc    Admin sends a message/notification to a client
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { clientId, subject, message } = req.body;

  try {
    if (!clientId || !subject || !message) {
      return res.status(400).json({ error: 'Client ID, subject, and message are required' });
    }

    const notification = await Notification.create({
      user: clientId,
      title: subject,
      message: message,
      isRead: false
    });

    return res.status(201).json({
      id: notification._id,
      subject: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error sending message' });
  }
});

// @route   POST /api/messages/:id/read
// @desc    Mark client notification/message as read
// @access  Private
router.post('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!notification) {
      return res.status(404).json({ error: 'Message not found' });
    }

    notification.isRead = true;
    await notification.save();

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error reading message' });
  }
});

// @route   POST /api/messages/read-all
// @desc    Mark all client notifications as read
// @access  Private
router.post('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false, category: { $ne: 'chat' } }, { isRead: true });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error reading all messages' });
  }
});

module.exports = router;
