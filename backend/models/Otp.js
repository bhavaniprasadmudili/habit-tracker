const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['register', 'login', 'reset'], required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

otpSchema.index({ userId: 1, type: 1 });
otpSchema.index({ code: 1, expiresAt: 1 });

module.exports = mongoose.model('Otp', otpSchema);
