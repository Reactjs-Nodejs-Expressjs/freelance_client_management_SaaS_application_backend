const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Project = require('../models/Project');

// @route   GET /api/updates
// @desc    Get project updates timeline
// @access  Private
router.get('/', protect, async (req, res) => {
  const { projectId } = req.query;

  try {
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Clients can only check updates for their own projects
    if (req.user.role === 'client' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Map _id -> id for compatibility with UI map(u => u.id)
    const formattedUpdates = project.updates.map(u => ({
      id: u._id,
      title: u.title,
      description: u.description,
      category: u.category,
      progress: u.progress || 0,
      links: u.links || [],
      imageUrls: u.imageUrls || [],
      createdAt: u.createdAt
    }));

    // Sort descending by date
    formattedUpdates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ data: formattedUpdates });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching updates' });
  }
});

module.exports = router;
