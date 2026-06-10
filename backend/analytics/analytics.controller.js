const Habit = require('../models/Habit');
const History = require('../models/History');

function sumByDate(records, dateKey) {
  return records.reduce((acc, item) => {
    acc[item[dateKey]] = (acc[item[dateKey]] || 0) + 1;
    return acc;
  }, {});
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function weekRange(days = 7) {
  const list = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

async function dailyAnalytics(req, res) {
  const today = todayString();
  const records = await History.find({ userId: req.user._id, date: today });
  const total = records.length;
  const completed = records.filter((r) => r.completed).length;
  res.json({ date: today, total, completed, completionRate: total ? Math.round((completed / total) * 100) : 0 });
}

async function weeklyAnalytics(req, res) {
  const range = weekRange(7);
  const records = await History.find({ userId: req.user._id, date: { $in: range } }).lean();
  const grouped = sumByDate(records, 'date');
  const completed = records.filter((r) => r.completed).length;
  const total = records.length;
  res.json({ range, grouped, completionRate: total ? Math.round((completed / total) * 100) : 0, completed, total });
}

async function monthlyAnalytics(req, res) {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const records = await History.find({ userId: req.user._id, date: { $gte: from.toISOString().slice(0, 10) } }).lean();
  const completed = records.filter((r) => r.completed).length;
  const total = records.length;
  const categories = [...new Set(records.map((r) => r.habitId?.toString()))];
  res.json({ completionRate: total ? Math.round((completed / total) * 100) : 0, completed, total, categoryCount: categories.length });
}

async function categoryAnalytics(req, res) {
  const habits = await Habit.find({ userId: req.user._id }).lean();
  const habitIds = habits.map((h) => h._id);
  const histories = await History.find({ userId: req.user._id, habitId: { $in: habitIds } }).lean();
  const categories = ['Health', 'Study', 'Fitness', 'Productivity', 'Finance'];
  const output = categories.map((category) => {
    const categoryHabits = habits.filter((h) => h.category === category);
    const ids = categoryHabits.map((h) => h._id.toString());
    const categoryRecords = histories.filter((r) => ids.includes(r.habitId.toString()));
    const completed = categoryRecords.filter((r) => r.completed).length;
    const total = categoryRecords.length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    return { category, progress, completed, total, trend: categoryRecords.length ? 'stable' : 'new' };
  });
  res.json({ categories: output });
}

module.exports = { dailyAnalytics, weeklyAnalytics, monthlyAnalytics, categoryAnalytics };
