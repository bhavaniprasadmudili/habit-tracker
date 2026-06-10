const Habit = require('../models/Habit');
const History = require('../models/History');
const ActivityLog = require('../models/ActivityLog');
const { publishEvent } = require('../realtime');

const categories = ['Health', 'Study', 'Fitness', 'Productivity', 'Finance'];

async function logActivity(userId, action, req, meta = {}) {
  await ActivityLog.create({ userId, action, ip: req.ip, device: req.headers['user-agent'] || 'unknown', meta });
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function recalculateHabit(habitId) {
  const habit = await Habit.findById(habitId);
  if (!habit) return;
  const histories = await History.find({ habitId: habit._id }).lean();
  const total = histories.length;
  const completed = histories.filter((h) => h.completed).length;
  habit.completionRate = total ? Math.round((completed / total) * 100) : 0;
  // Robust streak calculation using a set of completed YYYY-MM-DD dates.
  // Streak = consecutive completed days ending today, going backwards.
  const completedDates = new Set(
    histories.filter((h) => h.completed).map((h) => h.date)
  );

  let streak = 0;
  const cursor = new Date();
  // Continue while cursor date is completed.
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!completedDates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  habit.streak = streak;

  // overdue detection based on dueDate (UTC)
  const now = new Date();
  const isOverdue = !!habit.dueDate && !habit.completionRate || (habit.dueDate && habit.completionRate < 100 && now > habit.dueDate);

  if (habit.completionRate >= 100) {
    habit.status = 'completed';
  } else if (isOverdue) {
    habit.status = 'overdue';
  } else {
    habit.status = 'active';
  }

  await habit.save();
}

async function getHabits(req, res) {
  const habits = await Habit.find({ userId: req.user._id });
  const today = todayString();
  const history = await History.find({ userId: req.user._id, date: today }).lean();
  res.json({ habits, todayHistory: history });
}

async function createHabit(req, res) {
  try {
    const { title, category, targetValue, unit, icon, dueDate, startTime, endTime, priority } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const habit = await Habit.create({
      userId: req.user._id,
      title,
      category: categories.includes(category) ? category : 'Productivity',
      targetValue: Number(targetValue) || 1,
      unit: unit || 'times',
      icon: icon || '✨',

      // UTC dates (client should send ISO with Z)
      dueDate: dueDate ? new Date(dueDate) : null,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,

      priority: priority || 'medium',
    });

    await logActivity(req.user._id, 'HABIT_CREATED', req, { habitId: habit._id });
    await publishEvent('habit_created', { habit });
    return res.status(201).json({ habit });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to create habit' });
  }
}

async function updateHabit(req, res) {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    const { title, category, targetValue, unit, icon, status, dueDate, startTime, endTime, priority } = req.body;
    if (title) habit.title = title;
    if (category) habit.category = categories.includes(category) ? category : habit.category;
    if (targetValue !== undefined) habit.targetValue = Number(targetValue) || habit.targetValue;
    if (unit) habit.unit = unit;
    if (icon) habit.icon = icon;
    if (priority) habit.priority = priority;

    if (dueDate !== undefined) habit.dueDate = dueDate ? new Date(dueDate) : null;
    if (startTime !== undefined) habit.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) habit.endTime = endTime ? new Date(endTime) : null;

    if (status) habit.status = status;

    await habit.save();
    await recalculateHabit(habit._id);
    await logActivity(req.user._id, 'HABIT_UPDATED', req, { habitId: habit._id });
    await publishEvent('habit_updated', { habit });
    res.json({ habit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to update habit' });
  }
}

async function deleteHabit(req, res) {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    await History.deleteMany({ habitId: habit._id });
    await logActivity(req.user._id, 'HABIT_DELETED', req, { habitId: habit._id });
    await publishEvent('habit_deleted', { habitId: habit._id });
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to delete habit' });
  }
}

async function toggleHabitProgress(req, res) {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    const { date, completed, value } = req.body;
    const historyDate = date || todayString();

    // If task completed and endTime is not set yet, set it to now
    // (client can also send endTime explicitly)
    if (completed === true && habit.endTime == null) {
      habit.endTime = new Date();
    }

    const record = await History.findOneAndUpdate(

      { userId: req.user._id, habitId: habit._id, date: historyDate },
      { userId: req.user._id, habitId: habit._id, date: historyDate, completed: completed === true, value: Number(value || 0) },
      { upsert: true, new: true }
    );
    await recalculateHabit(habit._id);
    await logActivity(req.user._id, record.completed ? 'HABIT_COMPLETED' : 'HABIT_PROGRESS_UPDATED', req, { habitId: habit._id, date: historyDate });
    await publishEvent('progress_updated', { habitId: habit._id, record });
    await publishEvent('streak_updated', { habitId: habit._id, streak: habit.streak }, `user_${req.user._id}`);
    return res.json({ record, habit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to update habit progress' });
  }
}

module.exports = { getHabits, createHabit, updateHabit, deleteHabit, toggleHabitProgress };
