const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const DeletedClient = require('../models/DeletedClient');
const Message = require('../models/Message');
const Payment = require('../models/Payment');
const { sendCredentialsEmail } = require('../utils/email');

// @route   GET /api/clients
// @desc    Get all clients (supports search & registrationType filter)
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const filter = { role: 'client' };
    if (req.query.registrationType) {
      if (req.query.registrationType === 'admin_created') {
        filter.registrationType = { $ne: 'self_registered' };
      } else {
        filter.registrationType = req.query.registrationType;
      }
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex }
      ];
    }

    const total = await User.countDocuments(filter);
    const clients = await User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
    const formatted = await Promise.all(clients.map(async (c) => {
      const projectCount = await Project.countDocuments({ client: c._id });
      return {
        id: c._id,
        name: c.name,
        email: c.email,
        company: c.company,
        phone: c.phone,
        photoUrl: c.photoUrl,
        currency: c.currency || 'INR',
        registrationType: c.registrationType || 'admin_created',
        lastLoginAt: c.lastLoginAt || null,
        createdAt: c.createdAt,
        projectCount
      };
    }));
    return res.json({ data: formatted, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching clients' });
  }
});

// @route   POST /api/clients/register
// @desc    Self-register a new client from public home page
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, company, phone } = req.body;
  const pwd = password || 'client123';

  try {
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const clientExists = await User.findOne({ email });
    if (clientExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const client = await User.create({
      name,
      email,
      password: pwd,
      plainPassword: pwd,
      role: 'client',
      company: company || '',
      phone: phone || '',
      photoUrl: '',
      registrationType: 'self_registered'
    });

    // Send email with credentials from the backend
    try { await sendCredentialsEmail(name, email, pwd); } catch(e) { console.error('Email send error:', e); }

    // Create welcome notification
    await Notification.create({
      user: client._id,
      title: 'Welcome to Strategic Brand Solutions Portal',
      message: `Hello ${name}, welcome to your client portal! We will share project progress updates, milestones, and payment receipts here.`
    });

    // Notify Admin about self-registration
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      await Notification.create({
        user: adminUser._id,
        title: 'New Client Registered Self',
        message: `Client ${name} (${company || 'No Company'}) self-registered from the Home Page.`
      });
    }

    return res.status(201).json({
      id: client._id,
      name: client.name,
      email: client.email,
      company: client.company,
      phone: client.phone
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error creating client self-registration' });
  }
});

// @route   GET /api/clients/recycle-bin
// @desc    Get soft-deleted clients
// @access  Private/Admin
router.get('/recycle-bin', protect, admin, async (req, res) => {
  try {
    const deleted = await DeletedClient.find({}).sort({ deletedAt: -1 });
    return res.json({ data: deleted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching recycle bin' });
  }
});

// @route   GET /api/clients/credentials
// @desc    Get all client credentials listing (including plainPassword for admin)
// @access  Private/Admin
router.get('/credentials', protect, admin, async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' }).select('name email company phone plainPassword createdAt').sort({ createdAt: -1 });
    const formatted = clients.map(c => ({
      id: c._id,
      name: c.name,
      email: c.email,
      company: c.company,
      phone: c.phone,
      password: c.plainPassword || '••••••••',
      createdAt: c.createdAt
    }));
    return res.json(formatted);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching credentials' });
  }
});

// @route   POST /api/clients
// @desc    Create a new client
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { name, email, password, company, phone } = req.body;
  const pwd = password || 'client123';

  try {
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const clientExists = await User.findOne({ email });
    if (clientExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const client = await User.create({
      name,
      email,
      password: pwd,
      plainPassword: pwd,
      role: 'client',
      company: company || '',
      phone: phone || '',
      photoUrl: '',
      registrationType: 'admin_created'
    });

    // Send email with credentials from the backend
    try { await sendCredentialsEmail(name, email, pwd); } catch(e) { console.error('Email send error:', e); }

    // Create welcome notification
    await Notification.create({
      user: client._id,
      title: 'Welcome to Strategic Brand Solutions Portal',
      message: `Hello ${name}, welcome to your client portal! We will share project progress updates, milestones, and payment receipts here.`
    });

    return res.status(201).json({
      id: client._id,
      name: client.name,
      email: client.email,
      company: client.company,
      phone: client.phone
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error creating client' });
  }
});

// @route   POST /api/clients/:id/reset-password
// @desc    Admin resets a client's password
// @access  Private/Admin
router.post('/:id/reset-password', protect, admin, async (req, res) => {
  const { newPassword } = req.body;

  try {
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }

    const client = await User.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    client.password = newPassword;
    client.plainPassword = newPassword;
    await client.save();

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error resetting password' });
  }
});

// @route   PATCH /api/clients/:id
// @desc    Update client profile details (name, phone, company, photoUrl)
// @access  Private
router.patch('/:id', protect, async (req, res) => {
  try {
    if (req.user.role === 'client' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, phone, company, email, photoUrl } = req.body;
    const client = await User.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (name) client.name = name;
    if (phone !== undefined) client.phone = phone;
    if (company !== undefined) client.company = company;
    if (photoUrl !== undefined) client.photoUrl = photoUrl;
    // Admin can also update email
    if (req.user.role === 'admin' && email) client.email = email;

    await client.save();

    return res.json({
      id: client._id,
      name: client.name,
      email: client.email,
      role: client.role,
      company: client.company,
      phone: client.phone,
      photoUrl: client.photoUrl
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error updating client details' });
  }
});

// @route   DELETE /api/clients/:id
// @desc    Soft-delete a client (moves to recycle bin)
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const client = await User.findById(req.params.id);
    if (!client || client.role !== 'client') {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Save to recycle bin
    await DeletedClient.create({
      originalId: client._id,
      name: client.name,
      email: client.email,
      company: client.company,
      phone: client.phone,
      plainPassword: client.plainPassword,
      photoUrl: client.photoUrl,
      createdAt: client.createdAt,
      deletedBy: req.user._id
    });

    // Delete all related data for this client
    await Project.deleteMany({ client: client._id });
    await Payment.deleteMany({ client: client._id });
    await Message.deleteMany({ $or: [{ sender: client._id }, { recipient: client._id }] });
    await Notification.deleteMany({ user: client._id });

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: 'Client and all related data moved to recycle bin' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error deleting client' });
  }
});

// @route   POST /api/clients/recycle-bin/:id/restore
// @desc    Restore a soft-deleted client
// @access  Private/Admin
router.post('/recycle-bin/:id/restore', protect, admin, async (req, res) => {
  try {
    const deleted = await DeletedClient.findById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Deleted record not found' });
    }

    // Check email is not taken again
    const existing = await User.findOne({ email: deleted.email });
    if (existing) {
      return res.status(400).json({ error: 'Email already taken by another user. Cannot restore.' });
    }

    const pwd = deleted.plainPassword || 'client123';
    const restored = await User.create({
      _id: deleted.originalId,
      name: deleted.name,
      email: deleted.email,
      password: pwd,
      plainPassword: pwd,
      role: 'client',
      company: deleted.company,
      phone: deleted.phone,
      photoUrl: deleted.photoUrl,
      createdAt: deleted.createdAt
    });

    await DeletedClient.findByIdAndDelete(req.params.id);

    return res.json({ success: true, client: { id: restored._id, name: restored.name, email: restored.email } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error restoring client' });
  }
});

// @route   GET /api/clients/:id
// @desc    Get client details and their projects
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    if (req.user.role === 'client' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const client = await User.findById(req.params.id).select('-password');
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const projects = await Project.find({ client: client._id }).sort({ createdAt: -1 });
    
    const formattedProjects = projects.map(p => ({
      id: p._id,
      name: p.name,
      status: p.status,
      progress: p.progress,
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      currency: p.currency,
      deadline: p.deadline
    }));

    return res.json({ client, projects: formattedProjects });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching client details' });
  }
});

// @route   DELETE /api/clients/recycle-bin/:id/permanent
// @desc    Permanently delete a client from recycle bin (no recovery)
// @access  Private/Admin
router.delete('/recycle-bin/:id/permanent', protect, admin, async (req, res) => {
  try {
    const deleted = await DeletedClient.findById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Deleted record not found' });
    }

    await DeletedClient.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: 'Client permanently deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error permanently deleting client' });
  }
});

module.exports = router;
