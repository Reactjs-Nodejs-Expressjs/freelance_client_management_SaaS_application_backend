const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const Schedule = require('../models/Schedule');
const { sendProjectWelcomeEmail, sendFeedbackRequestEmail } = require('../utils/email');

// @route   GET /api/projects
// @desc    Get projects list (for both Admin and Clients)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      const { clientId, status } = req.query;
      const filter = {};
      if (clientId && clientId !== 'undefined') filter.client = clientId;
      if (status && status !== 'all') filter.status = status;
      projects = await Project.find(filter)
        .populate('client', 'name email company')
        .sort({ createdAt: -1 });
    } else {
      // Clients only see their own projects
      const clientFilter = { client: req.user._id };
      if (req.query.status && req.query.status !== 'all') clientFilter.status = req.query.status;
      projects = await Project.find(clientFilter)
        .populate('client', 'name email company')
        .sort({ createdAt: -1 });
    }

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
      deadline: p.deadline,
      color: p.color || '#3b82f6',
      liveUrl: p.liveUrl || '',
      showcase: p.showcase || false
    }));

    return res.json({ data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching projects' });
  }
});

// @route   GET /api/projects/public
// @desc    Get public projects showcase (for home page portfolio)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const projects = await Project.find({ showcase: true })
      .populate('client', 'name company')
      .sort({ progress: -1 });

    const formatted = projects.map(p => ({
      id: p._id,
      name: p.name,
      description: p.description,
      clientName: p.client ? p.client.name : '',
      clientCompany: p.client ? p.client.company : '',
      status: p.status,
      progress: p.progress,
      color: p.color || '#3b82f6',
      liveUrl: p.liveUrl || '',
      imageUrl: p.imageUrl || '',
      milestones: p.milestones || [],
      updates: p.updates || [],
      startDate: p.startDate,
      deadline: p.deadline,
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      currency: p.currency
    }));

    return res.json({ data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching public projects' });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { name, description, clientId, totalAmount, currency, startDate, deadline, milestones, color, preferredSlot, showcase, imageUrl } = req.body;

  try {
    if (!name || !clientId || !totalAmount) {
      return res.status(400).json({ error: 'Project name, client, and total budget amount are required' });
    }

    const clientUser = await User.findById(clientId);
    if (!clientUser) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const formattedMilestones = (milestones || []).map(m => ({
      title: m.title,
      dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
      status: m.status || 'pending'
    }));

    const project = await Project.create({
      name,
      description: description || '',
      client: clientId,
      totalAmount,
      currency: currency || 'INR',
      startDate: startDate ? new Date(startDate) : new Date(),
      deadline: deadline ? new Date(deadline) : undefined,
      color: color || '#3b82f6',
      liveUrl: req.body.liveUrl || '',
      showcase: showcase || false,
      imageUrl: imageUrl || '',
      milestones: formattedMilestones,
      updates: [{
        title: 'Project Initiated',
        description: `Project "${name}" has been successfully set up and planning has started.`,
        category: 'general'
      }]
    });

    // Send project welcome email with credentials & budget to client
    try {
      await sendProjectWelcomeEmail(
        clientUser.name,
        clientUser.email,
        clientUser.plainPassword || 'client123',
        project.name,
        project.totalAmount,
        project.currency
      );
    } catch (e) {
      console.error('Failed to send project welcome email:', e.message);
    }

    // Auto-generate invoice/payment request for the project total budget
    const qrToken = `SBS-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await Payment.create({
      project: project._id,
      projectName: project.name,
      clientName: clientUser.name,
      amount: totalAmount,
      currency: currency || 'INR',
      note: 'Initial Project Invoice',
      qrToken,
      status: 'pending'
    });

    // Auto-schedule project task/deadline if dates are provided
    if (project.startDate && project.deadline) {
      let startHour = 10;
      let endHour = 14;
      if (preferredSlot === 'afternoon') {
        startHour = 15;
        endHour = 20;
      } else if (preferredSlot === 'fullday') {
        startHour = 10;
        endHour = 20;
      }
      
      const sD = new Date(project.startDate);
      sD.setHours(startHour, 0, 0, 0);

      const eD = new Date(project.deadline);
      eD.setHours(endHour, 0, 0, 0);

      await Schedule.create({
        title: `Project Work: ${project.name}`,
        description: `Auto-scheduled at project initiation. Client: ${clientUser.name}`,
        startDate: sD,
        endDate: eD,
        projects: [project._id],
        color: project.color
      });
    }

    return res.status(201).json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error creating project' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get project detail
// @access  Private
router.get('/:id', protect, async (req, res) => {
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
router.put('/:id', protect, admin, async (req, res) => {
  const { name, description, status, progress, totalAmount, currency, deadline, color } = req.body;

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
    if (color) project.color = color;
    if (req.body.liveUrl !== undefined) project.liveUrl = req.body.liveUrl;
    if (req.body.showcase !== undefined) project.showcase = req.body.showcase;
    if (req.body.imageUrl !== undefined) project.imageUrl = req.body.imageUrl;

    // If there is progress or status updates, add to timeline
    if (progressUpdateString || statusUpdateString) {
      project.updates.push({
        title: 'Project Updated',
        description: `${statusUpdateString} ${progressUpdateString}`.trim(),
        category: 'general',
        progress: project.progress
      });
    }

    await project.save();

    // Sync title/color with associated schedule events
    if (name || color) {
      const scheduleUpdate = {};
      if (color) scheduleUpdate.color = color;
      if (name) scheduleUpdate.title = `Project Work: ${name}`;
      await Schedule.updateMany({ projects: project._id }, { $set: scheduleUpdate });
    }

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

    // Check if project reaches 100% or completed to trigger feedback request
    if ((project.progress === 100 || project.status === 'completed') && !project.feedbackEmailSent) {
      const clientUser = await User.findById(project.client);
      if (clientUser) {
        try {
          await sendFeedbackRequestEmail(
            clientUser.name,
            clientUser.email,
            project.name,
            project._id
          );
          project.feedbackEmailSent = true;
          await project.save();
        } catch (e) {
          console.error('Failed to send feedback email in PUT route:', e.message);
        }
      }
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
router.post('/:id/milestones', protect, admin, async (req, res) => {
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
      category: 'milestone',
      progress: project.progress
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
router.put('/:id/milestones/:mId', protect, admin, async (req, res) => {
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
        category: 'milestone',
        progress: project.progress
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
router.delete('/:id/milestones/:mId', protect, admin, async (req, res) => {
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
      category: 'milestone',
      progress: project.progress
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
router.post('/:id/updates', protect, admin, async (req, res) => {
  const { title, description, category, progress, links, imageUrls } = req.body;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const previousProgress = project.progress || 0;

    // Enforce progress can only increase
    let newProgress = previousProgress;
    if (progress !== undefined) {
      const requestedProgress = Number(progress);
      if (requestedProgress < previousProgress) {
        return res.status(400).json({
          error: `Progress can only increase. Current progress is ${previousProgress}%. You cannot set it to ${requestedProgress}%.`
        });
      }
      newProgress = requestedProgress;
    }

    const updateObj = {
      title,
      description: description || '',
      category: category || 'general',
      progress: newProgress,
      previousProgress,
      links: links || [],
      imageUrls: imageUrls || []
    };

    project.progress = newProgress;
    project.updates.push(updateObj);
    await project.save();

    // Notify client only when progress increases and is > 0
    if (newProgress > previousProgress && newProgress > 0) {
      await Notification.create({
        user: project.client,
        title: `Project Update: ${title}`,
        message: `A new update has been posted to project "${project.name}": "${title}". Project progress: ${newProgress}%`
      });
    }

    // Check if project reaches 100% or completed to trigger feedback request
    if ((project.progress === 100 || project.status === 'completed') && !project.feedbackEmailSent) {
      const clientUser = await User.findById(project.client);
      if (clientUser) {
        try {
          await sendFeedbackRequestEmail(
            clientUser.name,
            clientUser.email,
            project.name,
            project._id
          );
          project.feedbackEmailSent = true;
          await project.save();
        } catch (e) {
          console.error('Failed to send feedback email in POST updates route:', e.message);
        }
      }
    }

    return res.json({ ...project.toObject(), previousProgress });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error posting project update' });
  }
});

// @route   POST /api/projects/:id/messages
// @desc    Post a chat feedback message (accessible by BOTH Admin and Client)
// @access  Private
router.post('/:id/messages', protect, async (req, res) => {
  const { message } = req.body;

  try {
    if (!message) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Clients can only post message to their own project
    if (req.user.role === 'client' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
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
      // If client sent message, notify admin
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

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Clean up schedule events associated with this project
    await Schedule.deleteMany({ projects: project._id });
    // Clean up payments associated with this project
    await Payment.deleteMany({ project: project._id });

    await Project.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error deleting project' });
  }
});

module.exports = router;
