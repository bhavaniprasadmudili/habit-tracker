const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Task/Habit identity
  title: { type: String, required: true, trim: true },
  category: { type: String, trim: true, default: 'Productivity' },

  // === Task spec fields (UTC ISO Dates) ===
  // Example: new Date('2026-05-28T12:00:00.000Z')
  dueDate: { type: Date, default: null },
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },

  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },

  // Progress values (kept for compatibility with existing UI/analytics)
  targetValue: { type: Number, default: 1 },
  currentValue: { type: Number, default: 0 },
  unit: { type: String, trim: true, default: 'times' },

  streak: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'paused', 'completed', 'overdue'], default: 'active' },

  // computed/aux
  lastFocusedDurationMs: { type: Number, default: 0 },

  icon: { type: String, default: '✨' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });


module.exports = mongoose.model('Habit', habitSchema);
