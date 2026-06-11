const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Message = require('../models/Message');

// ==========================================
// CLIENT MANAGEMENT
// ==========================================

// @route   GET /api/clients
// @desc    Get all clients
// @access  Private/Admin
router.get('/clients', protect, admin, async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' }).select('-password').sort({ createdAt: -1 });
    return res.json({ data: clients });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching clients' });
  }
});

// @route   POST /api/clients
// @desc    Create a new client
// @access  Private/Admin
router.post('/clients', protect, admin, async (req, res) => {
  const { name, email, password, company, phone } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const clientExists = await User.findOne({ email });
    if (clientExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const client = await User.create({
      name,
      email,
      password,
      role: 'client',
      company: company || '',
      phone: phone || ''
    });

    // Create a welcome notification for the client
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

// @route   GET /api/clients/:id
// @desc    Get client details and their projects
// @access  Private/Admin
router.get('/clients/:id', protect, admin, async (req, res) => {
  try {
    const client = await User.findById(req.params.id).select('-password');
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const projects = await Project.find({ client: client._id }).sort({ createdAt: -1 });
    return res.json({ client, projects });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching client details' });
  }
});

// ==========================================
// PROJECT MANAGEMENT
// ==========================================

// @route   GET /api/projects
// @desc    Get all projects
// @access  Private/Admin
router.get('/projects', protect, admin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const projects = await Project.find({})
      .populate('client', 'name email company')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Format for frontend response
    const formatted = projects.map(p => ({
      id: p._id,
      name: p.name,
      description: p.description,
      clientName: p.client ? p.client.name : 'Unknown Client',
      clientEmail: p.client ? p.client.email : '',
      clientCompany: p.client ? p.client.company : '',
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
    return res.status(500).json({ error: 'Server error fetching projects' });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private/Admin
router.post('/projects', protect, admin, async (req, res) => {
  const { name, description, clientId, totalAmount, currency, deadline, milestones } = req.body;

  try {
    if (!name || !clientId || !totalAmount) {
      return res.status(400).json({ error: 'Project name, client, and total budget amount are required' });
    }

    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const project = await Project.create({
      name,
      description: description || '',
      client: clientId,
      totalAmount,
      currency: currency || 'INR',
      deadline: deadline ? new Date(deadline) : undefined,
      milestones: milestones || [],
      updates: [{
        title: 'Project Initiated',
        description: `Project "${name}" has been successfully set up and planning has started.`,
        category: 'general'
      }]
    });

    return res.status(201).json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error creating project' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get project detail
// @access  Private
router.get('/projects/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email company phone')
      .populate('messages.sender', 'name role');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Auth check: Clients can only see their own projects
    if (req.user.role === 'client' && project.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    return res.json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching project detail' });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project info (progress, status, budget, deadline)
// @access  Private/Admin
router.put('/projects/:id', protect, admin, async (req, res) => {
  const { name, description, status, progress, totalAmount, currency, deadline } = req.body;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let progressUpdateString = '';
    if (progress !== undefined && progress !== project.progress) {
      progressUpdateString = `Progress updated to ${progress}%.`;
    }

    let statusUpdateString = '';
    if (status && status !== project.status) {
      statusUpdateString = `Status updated to "${status.replace('_', ' ')}".`;
    }

    const previousProgress = project.progress || 0;

    project.name = name || project.name;
    project.description = description !== undefined ? description : project.description;
    project.status = status || project.status;
    project.progress = progress !== undefined ? progress : project.progress;
    project.totalAmount = totalAmount || project.totalAmount;
    project.currency = currency || project.currency;
    if (deadline) project.deadline = new Date(deadline);

    // If there is progress or status updates, add to timeline
    if (progressUpdateString || statusUpdateString) {
      project.updates.push({
        title: 'Project Updated',
        description: `${statusUpdateString} ${progressUpdateString}`.trim(),
        category: 'general'
      });
    }

    await project.save();

    // Notify client only when progress increases and is > 0
    const prevProg = Number(previousProgress) || 0;
    const reqProg = progress !== undefined ? Number(progress) : undefined;
    if (reqProg !== undefined && reqProg > prevProg && reqProg > 0) {
      await Notification.create({
        user: project.client,
        title: 'Project Progress Update',
        message: `Your project "${project.name}" has been updated. Status: ${project.status.replace('_', ' ')}, Progress: ${project.progress}%`
      });
    }

    return res.json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error updating project' });
  }
});

// @route   POST /api/projects/:id/milestones
// @desc    Add a milestone to project
// @access  Private/Admin
router.post('/projects/:id/milestones', protect, admin, async (req, res) => {
  const { title, dueDate } = req.body;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.milestones.push({ title, dueDate: dueDate ? new Date(dueDate) : undefined });
    project.updates.push({
      title: 'New Milestone Added',
      description: `Milestone "${title}" has been added to the checklist.`,
      category: 'milestone'
    });

    await project.save();

    return res.json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error adding milestone' });
  }
});

// @route   PUT /api/projects/:id/milestones/:mId
// @desc    Update a milestone status
// @access  Private/Admin
router.put('/projects/:id/milestones/:mId', protect, admin, async (req, res) => {
  const { status } = req.body;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const milestone = project.milestones.id(req.params.mId);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    const oldStatus = milestone.status;
    milestone.status = status;

    if (oldStatus !== status) {
      project.updates.push({
        title: `Milestone ${status === 'completed' ? 'Completed ✅' : 'Updated'}`,
        description: `Milestone "${milestone.title}" is now marked as "${status}".`,
        category: 'milestone'
      });
    }

    await project.save();

    // Notify client
    await Notification.create({
      user: project.client,
      title: `Milestone Update: ${milestone.title}`,
      message: `The milestone "${milestone.title}" has been marked as "${status}" for project "${project.name}".`
    });

    return res.json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error updating milestone' });
  }
});

// @route   DELETE /api/projects/:id/milestones/:mId
// @desc    Delete a milestone
// @access  Private/Admin
router.delete('/projects/:id/milestones/:mId', protect, admin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const milestone = project.milestones.id(req.params.mId);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    project.updates.push({
      title: 'Milestone Removed',
      description: `Milestone "${milestone.title}" was deleted.`,
      category: 'milestone'
    });

    project.milestones.pull(req.params.mId);
    await project.save();

    return res.json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error deleting milestone' });
  }
});

// @route   POST /api/projects/:id/updates
// @desc    Add a project timeline update/log
// @access  Private/Admin
router.post('/projects/:id/updates', protect, admin, async (req, res) => {
  const { title, description, category } = req.body;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.updates.push({ title, description, category: category || 'general' });
    await project.save();

    // Notify client
    await Notification.create({
      user: project.client,
      title: `Project Update: ${title}`,
      message: `A new update has been posted to project "${project.name}": "${title}". Description: ${description}`
    });

    return res.json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error posting project update' });
  }
});

// @route   POST /api/projects/:id/messages
// @desc    Post a chat message to client on project
// @access  Private
router.post('/projects/:id/messages', protect, async (req, res) => {
  const { message } = req.body;

  try {
    if (!message) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Add chat message
    project.messages.push({
      sender: req.user._id,
      message
    });
    await project.save();

    // Send direct Notification/Message to inbox of the recipient
    if (req.user.role === 'admin') {
      await Notification.create({
        user: project.client,
        title: `New message on project "${project.name}"`,
        message: `${req.user.name}: ${message}`
      });
    } else {
      // If client sent message, notify admin (we can associate admin id or send generic notification)
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        await Notification.create({
          user: adminUser._id,
          title: `Client message from ${req.user.name}`,
          message: `On project "${project.name}": ${message}`
        });
      }
    }

    // Populate and return project
    const updatedProject = await Project.findById(req.params.id)
      .populate('client', 'name email company phone')
      .populate('messages.sender', 'name role');

    return res.json(updatedProject);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error posting message' });
  }
});

// ==========================================
// PAYMENT TRANSACTIONS
// ==========================================

// @route   GET /api/payments
// @desc    Get all payments (paginated)
// @access  Private/Admin
router.get('/payments', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Payment.countDocuments({});
    const payments = await Payment.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Format for frontend response
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
      verificationStep: p.verificationStep,
      firstVerifiedAt: p.firstVerifiedAt,
      secondVerifiedAt: p.secondVerifiedAt,
      createdAt: p.createdAt
    }));

    return res.json({ data: formatted, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching payments' });
  }
});

// @route   POST /api/payments
// @desc    Request a payment (creates pending transaction with QR token)
// @access  Private/Admin
router.post('/payments', protect, admin, async (req, res) => {
  const { projectId, amount, currency, note } = req.body;

  try {
    if (!projectId || !amount) {
      return res.status(400).json({ error: 'Project ID and amount are required' });
    }

    const project = await Project.findById(projectId).populate('client');
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate unique QR Token
    const qrToken = `SBS-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await Payment.create({
      project: projectId,
      projectName: project.name,
      clientName: project.client ? project.client.name : 'Unknown Client',
      amount,
      currency: currency || 'INR',
      note: note || '',
      qrToken,
      status: 'pending'
    });

    // Notify client inbox of the new payment request
    await Notification.create({
      user: project.client._id,
      title: 'New Payment Invoice Requested',
      message: `Strategic Brand Solutions has requested a payment of ${currency} ${amount} for project "${project.name}". Please scan the QR code to proceed.`
    });

    return res.status(201).json({
      id: payment._id,
      projectId: payment.project,
      projectName: payment.projectName,
      clientName: payment.clientName,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      qrToken: payment.qrToken,
      createdAt: payment.createdAt
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error requesting payment' });
  }
});

// @route   POST /api/payments/:id/verify-step1
// @desc    First verification step for payment receipt
// @access  Private/Admin
router.post('/payments/:id/verify-step1', protect, admin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.status = 'first_verified';
    payment.verificationStep = 1;
    payment.firstVerifiedAt = new Date();

    await payment.save();

    // Create activity timeline log on the project
    const project = await Project.findById(payment.project);
    if (project) {
      project.updates.push({
        title: 'Payment First Verified',
        description: `Payment of ${payment.currency} ${payment.amount} has passed the initial validation check.`,
        category: 'payment'
      });
      await project.save();
    }

    return res.json({ success: true, payment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error during first verification' });
  }
});

// @route   POST /api/payments/:id/verify
// @desc    Final verification step for payment
// @access  Private/Admin
router.post('/payments/:id/verify', protect, admin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.status = 'verified';
    payment.verificationStep = 2;
    payment.secondVerifiedAt = new Date();

    await payment.save();

    // Update paid amount on the project and add to timeline
    const project = await Project.findById(payment.project);
    if (project) {
      project.paidAmount = (project.paidAmount || 0) + payment.amount;
      project.updates.push({
        title: 'Payment Verified & Applied',
        description: `Final verification approved for ${payment.currency} ${payment.amount}. Applied to project budget.`,
        category: 'payment'
      });
      await project.save();

      // Send invoice verification notification to client
      await Notification.create({
        user: project.client,
        title: 'Payment Confirmed ✅',
        message: `Your payment of ${payment.currency} ${payment.amount} for "${project.name}" has been fully verified and credited. Thank you!`,
        category: 'general'
      });
    }

    return res.json({ success: true, payment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error during final verification' });
  }
});

// @route   POST /api/admin/payments/:id/reject
// @desc    Reject payment request or proof with reason
// @access  Private/Admin
router.post('/payments/:id/reject', protect, admin, async (req, res) => {
  const { rejectReason } = req.body;

  try {
    if (!rejectReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.status = 'rejected';
    payment.rejectReason = rejectReason;
    payment.verificationStep = 0; // reset verification step if rejected

    await payment.save();

    // Log update on the project timeline if exists
    const project = await Project.findById(payment.project);
    if (project) {
      project.updates.push({
        title: 'Payment Rejected ❌',
        description: `Payment request of ${payment.currency} ${payment.amount} has been rejected. Reason: ${rejectReason}`,
        category: 'payment'
      });
      await project.save();

      // Send automated notification to client
      await Notification.create({
        user: project.client,
        title: 'Payment Submission Rejected ❌',
        message: `Your payment proof of ${payment.currency} ${payment.amount} for "${project.name}" has been rejected. Reason: ${rejectReason}`,
        category: 'general'
      });

    }

    return res.json({ success: true, payment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error during payment rejection' });
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

// @route   GET /api/notifications
// @desc    Get all notifications for admin (user = admin user id)
// @access  Private/Admin
router.get('/notifications', protect, admin, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching notifications' });
  }
});

// @route   POST /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private/Admin
router.post('/notifications/:id/read', protect, admin, async (req, res) => {
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
router.post('/notifications/read-all', protect, admin, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error marking notifications read' });
  }
});

// ==========================================
// CREDENTIALS LIST
// ==========================================

// @route   GET /api/credentials
// @desc    Get all client credentials listing (names, emails, active projects)
// @access  Private/Admin
router.get('/credentials', protect, admin, async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' }).select('name email company phone').sort({ createdAt: -1 });
    
    const data = await Promise.all(clients.map(async (c) => {
      const projects = await Project.find({ client: c._id }).select('name status');
      return {
        id: c._id,
        name: c.name,
        email: c.email,
        company: c.company,
        projects: projects.map(p => p.name)
      };
    }));

    return res.json({ data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching credentials' });
  }
});

module.exports = router;
