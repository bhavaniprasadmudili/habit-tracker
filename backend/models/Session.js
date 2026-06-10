const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Store only hashed refresh tokens.
  refreshTokenHash: { type: String, required: true, index: true },

  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null },
  lastUsedAt: { type: Date, default: null },

  // Basic device/session metadata (optional)
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

sessionSchema.index({ userId: 1, expiresAt: 1 });

// A session is considered active if it is not revoked and not expired.
sessionSchema.methods.isActive = function isActive() {
  const now = new Date();
  return !this.revokedAt && this.expiresAt > now;
};

module.exports = mongoose.model('Session', sessionSchema);

