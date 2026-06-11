const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  plainPassword: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'client'],
    default: 'client'
  },
  company: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  photoUrl: {
    type: String,
    default: ''
  },
  isLiveWorking: {
    type: Boolean,
    default: false
  },
  chatDisabled: {
    type: Boolean,
    default: false
  },
  rejectedPaymentsExpiryHours: {
    type: Number,
    default: 24 // default 24 hours (1 day)
  },
  logoUrl: {
    type: String,
    default: ''
  },
  logoText: {
    type: String,
    default: 'Strategic Brand'
  },
  address: {
    type: String,
    default: ''
  },
  registrationType: {
    type: String,
    enum: ['admin_created', 'self_registered'],
    default: 'admin_created'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
