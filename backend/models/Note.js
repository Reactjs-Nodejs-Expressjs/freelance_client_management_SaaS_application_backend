const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    default: 'Admin'
  },
  date: {
    type: Date,
    default: Date.now
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  popupTarget: {
    type: String,
    enum: ['none', 'admin', 'client', 'both'],
    default: 'none'
  },
  attachments: [{
    type: String
  }],
  category: {
    type: String,
    enum: ['tasks', 'works', 'social', 'archive', 'priority', 'personal', 'business'],
    default: 'works'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Note', NoteSchema);
