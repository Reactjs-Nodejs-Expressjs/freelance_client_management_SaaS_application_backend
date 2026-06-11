const express = require('express');
const router = express.Router();
const { protect, client } = require('../middleware/auth');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @route   GET /api/client/projects
// @desc    Get logged in client's projects
// @access  Private/Client
router.get('/projects', protect, client, async (req, res) => {
  try {
    const projects = await Project.find({ client: req.user._id }).sort({ createdAt: -1 });
    
    // Format for frontend response
    const formatted = projects.map(p => ({
      id: p._id,
      name: p.name,
      description: p.description,
      clientName: req.user.name,
      status: p.status,
      progress: p.progress,
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      currency: p.currency,
      startDate: p.startDate,
      deadline: p.deadline
    }));

    return res.json({ data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching client projects' });
  }
});

// @route   GET /api/client/payments
// @desc    Get logged in client's payments
// @access  Private/Client
router.get('/payments', protect, client, async (req, res) => {
  try {
    const payments = await Payment.find({ clientName: req.user.name }).sort({ createdAt: -1 });

    const formatted = payments.map(p => ({
      id: p._id,
      projectId: p.project,
      projectName: p.projectName,
      clientName: p.clientName,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      qrToken: p.qrToken,
      isUsed: p.isUsed,
      screenshotUrl: p.screenshotUrl,
      note: p.note,
      createdAt: p.createdAt
    }));

    return res.json({ data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching client payments' });
  }
});

// @route   GET /api/client/messages
// @desc    Get messages/inbox notifications for client
// @access  Private/Client
router.get('/messages', protect, client, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

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

// @route   POST /api/client/messages/:id/read
// @desc    Mark client notification/message as read
// @access  Private/Client
router.post('/messages/:id/read', protect, client, async (req, res) => {
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

// @route   POST /api/client/messages/read-all
// @desc    Mark all client notifications as read
// @access  Private/Client
router.post('/messages/read-all', protect, client, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error reading all messages' });
  }
});

// @route   GET /api/client/profile
// @desc    Get client profile details
// @access  Private/Client
router.get('/profile', protect, client, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// @route   PUT /api/client/profile
// @desc    Update client profile details (password, phone)
// @access  Private/Client
router.put('/profile', protect, client, async (req, res) => {
  const { name, phone, password } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Client not found' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    if (password) {
      user.password = password; // hashes automatically in pre-save hook
    }

    await user.save();
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      company: user.company,
      phone: user.phone
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error updating profile' });
  }
});

module.exports = router;
