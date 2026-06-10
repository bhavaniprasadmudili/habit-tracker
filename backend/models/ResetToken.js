const mongoose = require('mongoose');

const resetTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

resetTokenSchema.index({ token: 1, expiresAt: 1 });

module.exports = mongoose.model('ResetToken', resetTokenSchema);
