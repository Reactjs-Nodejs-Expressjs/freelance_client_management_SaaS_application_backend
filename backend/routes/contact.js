const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Contact = require('../models/Contact');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @route   POST /api/contact
// @desc    Submit a general contact message/inquiry
// @access  Public
router.post('/', async (req, res) => {
  const { name, phone, email, projectType, otherProjectType, subject, description, message } = req.body;

  try {
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const resolvedProjectType = projectType === 'other' ? (otherProjectType || 'Other') : (projectType || '');

    const contact = await Contact.create({
      name,
      phone: phone || '',
      email,
      projectType: resolvedProjectType,
      otherProjectType: otherProjectType || '',
      subject: subject || resolvedProjectType || 'General Inquiry',
      description: description || '',
      message
    });

    // Notify Admin about new inquiry
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      await Notification.create({
        user: adminUser._id,
        title: 'New Contact Inquiry Received',
        message: `From: ${name} (${email}) | Project: ${resolvedProjectType || 'N/A'} | Phone: ${phone || 'N/A'} | "${message.slice(0, 80)}..."`
      });
    }

    const { sendAdminContactNotificationEmail } = require('../utils/email');
    try {
      await sendAdminContactNotificationEmail({ name, email, subject: subject || resolvedProjectType, message });
    } catch (e) {
      console.error('Failed to send admin contact email notification:', e);
    }

    return res.status(201).json({ success: true, data: contact });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error saving contact message' });
  }
});

// @route   GET /api/contact
// @desc    Get all contact messages (Admin Only)
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const contacts = await Contact.find({}).sort({ createdAt: -1 });
    return res.json({ data: contacts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching contact messages' });
  }
});

// @route   DELETE /api/contact/:id
// @desc    Delete a contact message (Admin Only)
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    await Contact.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error deleting message' });
  }
});

module.exports = router;
