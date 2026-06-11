const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Get all notifications for admin (user = admin user id)
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id, category: { $ne: 'chat' } }).sort({ createdAt: -1 });
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false, category: { $ne: 'chat' } });

    // Map _id -> id
    const formatted = notifications.map(n => ({
      id: n._id,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      category: n.category,
      createdAt: n.createdAt
    }));

    return res.json({ notifications: formatted, unreadCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching notifications' });
  }
});

// @route   POST /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private/Admin
router.post('/:id/read', protect, admin, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error updating notification' });
  }
});

// @route   POST /api/notifications/read-all
// @desc    Mark all admin notifications as read
// @access  Private/Admin
router.post('/read-all', protect, admin, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false, category: { $ne: 'chat' } }, { isRead: true });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error marking notifications read' });
  }
});

module.exports = router;
