const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');

// @route   GET /api/credentials
// @desc    Get all client credentials listing (names, emails, active projects)
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
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
