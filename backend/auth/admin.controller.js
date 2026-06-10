const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Habit = require('../models/Habit');
const History = require('../models/History');
const ResetToken = require('../models/ResetToken');
const Otp = require('../models/Otp');
const ActivityLog = require('../models/ActivityLog');

const createJwt = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.passwordHash) return res.status(401).json({ message: 'Admin credentials not set' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = createJwt(user);
    return res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to log in as admin' });
  }
}

async function listUsers(req, res) {
  const users = await User.find().select('-passwordHash').lean();
  const stats = await Promise.all(users.map(async (user) => {
    const habits = await Habit.countDocuments({ userId: user._id });
    const completed = await History.countDocuments({ userId: user._id, completed: true });
    const total = await History.countDocuments({ userId: user._id });
    return {
      ...user,
      totalHabits: habits,
      completedHabits: completed,
      completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }));
  res.json({ users: stats });
}

async function getUser(req, res) {
  const user = await User.findById(req.params.id).select('-passwordHash').lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  const habits = await Habit.find({ userId: user._id }).lean();
  const history = await History.find({ userId: user._id }).sort({ date: -1 }).lean();
  res.json({ user, habits, history });
}

async function analytics(req, res) {
  const totalUsers = await User.countDocuments();
  const newRegistrations = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
  const totalHabits = await Habit.countDocuments();
  const completedHabits = await History.countDocuments({ completed: true });
  const avgCompletion = completedHabits > 0 ? Math.round((completedHabits / (await History.countDocuments())) * 100) : 0;
  const topUsers = await Habit.aggregate([
    { $group: { _id: '$userId', total: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 5 }
  ]);
  const categoryStats = await Habit.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  res.json({ totalUsers, newRegistrations, totalHabits, completedHabits, avgCompletion, topUsers, categoryStats });
}

async function activity(req, res) {
  const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(200).lean();
  res.json({ logs });
}

async function updateUserStatus(req, res) {
  const { status } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.suspended = status === 'suspended';
  await user.save();
  res.json({ message: 'User status updated' });
}

async function deleteUser(req, res) {
  await User.findByIdAndDelete(req.params.id);
  await Habit.deleteMany({ userId: req.params.id });
  await History.deleteMany({ userId: req.params.id });
  await ResetToken.deleteMany({ userId: req.params.id });
  await Otp.deleteMany({ userId: req.params.id });
  await ActivityLog.deleteMany({ userId: req.params.id });
  res.json({ message: 'User deleted successfully' });
}

module.exports = {
  login,
  listUsers,
  getUser,
  analytics,
  activity,
  updateUserStatus,
  deleteUser
};
