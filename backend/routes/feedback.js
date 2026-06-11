const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');

// @route   GET /api/feedback/project-info/:projectId
// @desc    Get project information for public feedback page validation
// @access  Public
router.get('/project-info/:projectId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('client', 'name company');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({
      projectName: project.name,
      clientName: project.client ? project.client.name : 'Client',
      clientCompany: project.client ? project.client.company : '',
      feedbackSubmitted: project.feedbackSubmitted || false
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching project info' });
  }
});

// @route   POST /api/feedback
// @desc    Submit project feedback
// @access  Public
router.post('/', async (req, res) => {
  const { projectId, rating, comments, recommendRating } = req.body;

  try {
    if (!projectId || !rating || !comments) {
      return res.status(400).json({ error: 'Project ID, rating (1-5), and comments are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.feedbackSubmitted) {
      return res.status(400).json({ error: 'Feedback has already been submitted for this project' });
    }

    const clientUser = await User.findById(project.client);
    if (!clientUser) {
      return res.status(404).json({ error: 'Associated client not found' });
    }

    // Create feedback
    const feedback = await Feedback.create({
      project: projectId,
      client: project.client,
      projectName: project.name,
      clientName: clientUser.name,
      clientCompany: clientUser.company || '',
      rating: Number(rating),
      comments,
      recommendRating: recommendRating !== undefined ? Number(recommendRating) : 10
    });

    // Mark feedback as submitted on project
    project.feedbackSubmitted = true;
    project.updates.push({
      title: 'Feedback Submitted',
      description: `Client has submitted project feedback rating of ${rating}/5 stars.`,
      category: 'general',
      progress: project.progress
    });
    await project.save();

    // Notify Admin
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      await Notification.create({
        user: adminUser._id,
        title: 'New Client Feedback Received',
        message: `Client ${clientUser.name} submitted a ${rating}-star feedback for project "${project.name}".`
      });
    }

    return res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error submitting feedback' });
  }
});

// @route   GET /api/feedback
// @desc    Get all client feedbacks & aggregated stats (for Admin)
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({}).sort({ createdAt: -1 });
    
    // Aggregation Stats
    const totalCount = feedbacks.length;
    let averageRating = 0;
    let recommendAverage = 0;
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalCount > 0) {
      let sumRating = 0;
      let sumRecommend = 0;

      feedbacks.forEach(f => {
        sumRating += f.rating;
        sumRecommend += f.recommendRating || 10;
        if (ratingCounts[f.rating] !== undefined) {
          ratingCounts[f.rating]++;
        }
      });

      averageRating = Number((sumRating / totalCount).toFixed(1));
      recommendAverage = Number((sumRecommend / totalCount).toFixed(1));
    }

    // Client satisfaction rate = percentage of 4 and 5 star ratings
    const satisfactionCount = ratingCounts[5] + ratingCounts[4];
    const satisfactionRate = totalCount > 0 ? Math.round((satisfactionCount / totalCount) * 100) : 100;

    return res.json({
      data: feedbacks,
      stats: {
        totalCount,
        averageRating,
        recommendAverage,
        satisfactionRate,
        ratingCounts
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching feedback listing' });
  }
});

// @route   GET /api/feedback/public
// @desc    Get public client feedbacks for landing page carousel
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const feedbacks = await Feedback.find({})
      .select('clientName clientCompany rating comments projectName createdAt')
      .sort({ createdAt: -1 })
      .limit(10);
    return res.json({ data: feedbacks });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching public feedbacks' });
  }
});

module.exports = router;
