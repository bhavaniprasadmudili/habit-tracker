const Habit = require('../models/Habit');
const History = require('../models/History');

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function weekRange(size = 7) {
  const dates = [];
  for (let offset = size - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

async function dashboard(req, res) {
  const habits = await Habit.find({ userId: req.user._id }).lean();
  const today = todayString();
  const weeklyDates = weekRange(7);
  const monthlyFrom = new Date();
  monthlyFrom.setDate(monthlyFrom.getDate() - 30);

  const history = await History.find({ userId: req.user._id, date: { $gte: monthlyFrom.toISOString().slice(0, 10) } }).lean();

  const todayHistory = history.filter((h) => h.date === today);
  const todayCompleted = todayHistory.filter((h) => h.completed).length;
  const todayTotal = habits.length;

  const weeklyRecords = history.filter((h) => weeklyDates.includes(h.date));
  const weeklyCompleted = weeklyRecords.filter((h) => h.completed).length;

  const monthlyCompleted = history.filter((h) => h.completed).length;
  const monthlyTotal = history.length;

  const categories = ['Health', 'Study', 'Fitness', 'Productivity', 'Finance'];
  const categorySummary = Object.fromEntries(
    categories.map((name) => [name, { completed: 0, total: 0, trend: 'steady' }])
  );

  // Build habitId -> category map once to avoid O(habits*history) filtering.
  const habitCategoryById = new Map(habits.map((h) => [h._id.toString(), h.category]));

  // Aggregate over history once.
  for (const rec of history) {
    const habitIdStr = rec.habitId.toString();
    const category = habitCategoryById.get(habitIdStr);
    if (!category) continue;
    if (!categorySummary[category]) {
      categorySummary[category] = { completed: 0, total: 0, trend: 'steady' };
    }
    categorySummary[category].total += 1;
    if (rec.completed) categorySummary[category].completed += 1;
  }

  for (const name of Object.keys(categorySummary)) {
    const c = categorySummary[name];
    c.progress = c.total ? Math.round((c.completed / c.total) * 100) : 0;
  }

  const todayProgress = todayTotal ? Math.round((todayCompleted / todayTotal) * 100) : 0;
  const weeklyProgress = weeklyRecords.length ? Math.round((weeklyCompleted / weeklyRecords.length) * 100) : 0;
  const monthlyProgress = monthlyTotal ? Math.round((monthlyCompleted / monthlyTotal) * 100) : 0;

  const categoryCards = categories.map((name) => ({ name, ...categorySummary[name] }));


  res.json({
    habits,
    summary: {
      todayProgress,
      weeklyProgress,
      monthlyProgress,
      totalHabits: habits.length,
      completedHabits: history.filter((h) => h.completed).length,
      completionRate: monthlyProgress
    },
    charts: {
      weeklyDates,
      weeklyHistory: weeklyDates.map((date) => weeklyRecords.filter((h) => h.date === date).length),
      monthlyHistory: Array.from({ length: 30 }, (_, idx) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - idx));
        return history.filter((h) => h.date === date.toISOString().slice(0, 10)).length;
      })
    },
    categories: categoryCards,
    todayHistory,
    recentActivity: history.slice(-10).reverse()
  });
}

module.exports = { dashboard };
