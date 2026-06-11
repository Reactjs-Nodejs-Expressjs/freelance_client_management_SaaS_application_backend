const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  projectName: {
    type: String,
    default: 'Direct Payment'
  },
  clientName: {
    type: String,
    default: 'Client'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'first_verified', 'verified', 'failed', 'rejected'],
    default: 'pending'
  },
  rejectReason: {
    type: String,
    default: ''
  },
  qrToken: {
    type: String
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  screenshotUrl: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  verificationStep: {
    type: Number,
    enum: [0, 1, 2],
    default: 0
  },
  firstVerifiedAt: {
    type: Date
  },
  secondVerifiedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  invoiceSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payment', PaymentSchema);
