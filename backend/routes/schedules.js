const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Schedule = require('../models/Schedule');
const Project = require('../models/Project');

// @route   GET /api/schedules
// @desc    Get all schedules
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const schedules = await Schedule.find({})
      .populate('projects', 'name client')
      .sort({ startDate: 1 });

    const formatted = schedules.map(s => ({
      id: s._id,
      title: s.title,
      description: s.description,
      startDate: s.startDate,
      endDate: s.endDate,
      projectIds: s.projects.map(p => p._id),
      projects: s.projects.map(p => ({ id: p._id, name: p.name })),
      color: s.color,
      createdAt: s.createdAt
    }));

    return res.json({ data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching schedules' });
  }
});

// @route   POST /api/schedules
// @desc    Create a new schedule event
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { title, description, startDate, endDate, projectIds, color } = req.body;

  try {
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: 'Title, start date, and end date are required' });
    }

    const schedule = await Schedule.create({
      title,
      description: description || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      projects: projectIds || [],
      color: color || '#3b82f6'
    });

    if (projectIds && projectIds.length > 0 && color) {
      await Project.updateMany({ _id: { $in: projectIds } }, { $set: { color } });
    }

    const populated = await Schedule.findById(schedule._id).populate('projects', 'name');

    return res.status(201).json({
      id: populated._id,
      title: populated.title,
      description: populated.description,
      startDate: populated.startDate,
      endDate: populated.endDate,
      projectIds: populated.projects.map(p => p._id),
      projects: populated.projects.map(p => ({ id: p._id, name: p.name })),
      color: populated.color,
      createdAt: populated.createdAt
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error creating schedule event' });
  }
});

// @route   PUT /api/schedules/:id
// @desc    Update a schedule event
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  const { title, description, startDate, endDate, projectIds, color } = req.body;

  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule event not found' });
    }

    if (title) schedule.title = title;
    if (description !== undefined) schedule.description = description;
    if (startDate) schedule.startDate = new Date(startDate);
    if (endDate) schedule.endDate = new Date(endDate);
    if (projectIds) schedule.projects = projectIds;
    if (color) schedule.color = color;

    await schedule.save();

    if (color && schedule.projects && schedule.projects.length > 0) {
      await Project.updateMany({ _id: { $in: schedule.projects } }, { $set: { color } });
    }

    const populated = await Schedule.findById(schedule._id).populate('projects', 'name');

    return res.json({
      id: populated._id,
      title: populated.title,
      description: populated.description,
      startDate: populated.startDate,
      endDate: populated.endDate,
      projectIds: populated.projects.map(p => p._id),
      projects: populated.projects.map(p => ({ id: p._id, name: p.name })),
      color: populated.color,
      createdAt: populated.createdAt
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error updating schedule event' });
  }
});

// @route   DELETE /api/schedules/:id
// @desc    Delete a schedule event
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule event not found' });
    }

    await schedule.deleteOne();
    return res.json({ success: true, message: 'Schedule event deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error deleting schedule event' });
  }
});

module.exports = router;
