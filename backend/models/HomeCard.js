const mongoose = require('mongoose');

const HomeCardSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['service', 'testimonial'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  bullets: [{
    type: String
  }],
  icon: {
    type: String,
    default: 'Globe' // default Lucide icon name
  },
  author: {
    type: String,
    default: ''
  },
  company: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 5
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('HomeCard', HomeCardSchema);
