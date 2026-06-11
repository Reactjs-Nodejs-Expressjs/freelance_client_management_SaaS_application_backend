const mongoose = require('mongoose');

const DeletedClientSchema = new mongoose.Schema({
  originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String, default: '' },
  phone: { type: String, default: '' },
  plainPassword: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  createdAt: { type: Date },
  deletedAt: { type: Date, default: Date.now },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('DeletedClient', DeletedClientSchema);
