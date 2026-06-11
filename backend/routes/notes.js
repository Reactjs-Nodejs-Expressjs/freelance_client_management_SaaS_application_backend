const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Note = require('../models/Note');

// @route   GET /api/notes
// @desc    Get all notes
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Both Admin and Client can get notes (Admin sees all, Client sees notes that are marked important or all general notes)
    // For simplicity, let's fetch all notes sorted by date.
    const notes = await Note.find({}).sort({ date: -1 });
    return res.json({ data: notes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching notes' });
  }
});

// @route   POST /api/notes
// @desc    Create a new note
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { title, content, author, date, popupTarget, attachments, category } = req.body;

  try {
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const note = await Note.create({
      title,
      content,
      author: author || 'Admin',
      date: date ? new Date(date) : undefined,
      popupTarget: popupTarget || 'none',
      isImportant: popupTarget ? (popupTarget !== 'none') : false,
      attachments: attachments || [],
      category: category || 'works'
    });

    return res.status(201).json(note);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error creating note' });
  }
});

// @route   PUT /api/notes/:id
// @desc    Update a note
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  const { title, content, author, date, popupTarget, attachments, category, isImportant } = req.body;

  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (author !== undefined) note.author = author;
    if (date !== undefined) note.date = new Date(date);
    if (popupTarget !== undefined) {
      note.popupTarget = popupTarget;
      note.isImportant = popupTarget !== 'none';
    }
    if (isImportant !== undefined) {
      note.isImportant = isImportant;
    }
    if (attachments !== undefined) note.attachments = attachments;
    if (category !== undefined) note.category = category;

    await note.save();
    return res.json(note);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error updating note' });
  }
});

// @route   DELETE /api/notes/:id
// @desc    Delete a note
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await note.deleteOne();
    return res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error deleting note' });
  }
});

module.exports = router;
