const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'strategic-brand-solutions-secret-key-999', {
    expiresIn: '30d'
  });
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      // Verify role matches selection if provided
      if (role && user.role !== role) {
        return res.status(401).json({ error: `User is not registered as ${role === 'admin' ? 'an Admin' : 'a Client'}` });
      }

      // If user is client, create login activity notification for admin
      if (user.role === 'client') {
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
          await Notification.create({
            user: adminUser._id,
            title: 'Client Logged In',
            message: `Client "${user.name}" (${user.email}) has logged in.`,
            category: 'login_activity'
          });
        }
      }

      return res.json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
          phone: user.phone
        }
      });
    } else {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      phone: user.phone,
      photoUrl: user.photoUrl,
      rejectedPaymentsExpiryHours: user.rejectedPaymentsExpiryHours,
      logoUrl: user.logoUrl,
      logoText: user.logoText,
      address: user.address || ''
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// @route   GET /api/auth/admin-info
// @desc    Get admin public profile info (for invoice display)
// @access  Private
router.get('/admin-info', protect, async (req, res) => {
  try {
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin info not found' });
    }
    return res.json({
      name: adminUser.name,
      email: adminUser.email,
      phone: adminUser.phone,
      company: adminUser.company,
      photoUrl: adminUser.photoUrl,
      logoUrl: adminUser.logoUrl,
      logoText: adminUser.logoText,
      address: adminUser.address || ''
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching admin info' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    if (req.user && req.user.role === 'client') {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        await Notification.create({
          user: adminUser._id,
          title: 'Client Logged Out',
          message: `Client "${req.user.name}" (${req.user.email}) has logged out.`,
          category: 'login_activity'
        });
      }
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error during logout' });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change current user password
// @access  Private
router.post('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide current and new password' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    user.password = newPassword; // Will be hashed in pre-save hook
    user.plainPassword = newPassword; // Sync with plainPassword for Admin display
    await user.save();

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error changing password' });
  }
});
// @route   PATCH /api/auth/profile
// @desc    Update current user profile (name, company, phone, photoUrl, rejectedPaymentsExpiryHours)
// @access  Private
router.patch('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, company, phone, photoUrl, rejectedPaymentsExpiryHours, logoUrl, logoText, address } = req.body;
    if (name) user.name = name;
    if (company !== undefined) user.company = company;
    if (phone !== undefined) user.phone = phone;
    if (photoUrl !== undefined) user.photoUrl = photoUrl;
    if (rejectedPaymentsExpiryHours !== undefined) user.rejectedPaymentsExpiryHours = rejectedPaymentsExpiryHours;
    if (logoUrl !== undefined) user.logoUrl = logoUrl;
    if (logoText !== undefined) user.logoText = logoText;
    if (address !== undefined) user.address = address;

    await user.save();

    // If the admin user has updated their profile/branding, regenerate all existing invoices
    if (user.role === 'admin') {
      try {
        const Payment = require('../models/Payment');
        const { generateInvoiceFile } = require('../utils/invoice');
        const payments = await Payment.find({});
        for (const p of payments) {
          await generateInvoiceFile(p._id);
        }
        console.log(`Auto-regenerated ${payments.length} invoices due to branding update.`);
      } catch (err) {
        console.error('Failed to auto-regenerate invoices on branding change:', err);
      }
    }

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      phone: user.phone,
      photoUrl: user.photoUrl,
      rejectedPaymentsExpiryHours: user.rejectedPaymentsExpiryHours,
      logoUrl: user.logoUrl,
      logoText: user.logoText,
      address: user.address || ''
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error updating profile' });
  }
});

// @route   GET /api/auth/branding
// @desc    Get admin branding info (logo + text) – public for all authenticated users
// @access  Private
router.get('/branding', protect, async (req, res) => {
  try {
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return res.json({ logoUrl: '', logoText: 'Strategic Brand' });
    }
    return res.json({
      logoUrl: adminUser.logoUrl || '',
      logoText: adminUser.logoText || 'Strategic Brand'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching branding' });
  }
});

module.exports = router;
