const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now },
  device: { type: String, default: 'unknown' },
  ip: { type: String, default: 'unknown' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
