import React from 'react';
import { socketService } from '../services/socket.js';
import { fetchJson } from '../services/api.js';
const { useState, useEffect, useMemo } = React;

const categories = ['Health', 'Study', 'Fitness', 'Productivity', 'Finance'];
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const habitIcons = ['✨', '💪', '📚', '🧘', '🏃', '💧', '🍎', '🧠', '🎯', '🌱', '💼', '💸', '🎵', '📈', '😌', '🏋️', '📝', '🌙', '🚀', '🔥', '🧩', '🧑‍💻', '💡', '🌞'];
const API_BASE = '/api';

function DashboardPage({ token, user, onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [habits, setHabits] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [newHabit, setNewHabit] = useState({ title: '', category: 'Productivity', icon: '✨' });
  const [showAdd, setShowAdd] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [dashboardData, habitsData] = await Promise.all([
          fetchJson(`${API_BASE}/dashboard`, token),
          fetchJson(`${API_BASE}/habits`, token)
        ]);
        setDashboard(dashboardData);
        setHabits(habitsData.habits);
      } catch (err) {
        setMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  useEffect(() => {
    if (!user) return undefined;

    const socketClient = socketService.connect(user);
    setSocket(socketClient);

    if (!socketClient) return undefined;

    socketClient.on('habit_created', (data) => setHabits((prev) => [...prev, data.habit]));
    socketClient.on('habit_updated', (data) => setHabits((prev) => prev.map((item) => item._id === data.habit._id ? data.habit : item)));
    socketClient.on('progress_updated', () => {
      fetchJson('/api/dashboard', token).then(setDashboard).catch(() => {});
    });
    socketClient.on('streak_updated', () => {
      fetchJson('/api/dashboard', token).then(setDashboard).catch(() => {});
    });

    return () => {
      socketClient.off('habit_created');
      socketClient.off('habit_updated');
      socketClient.off('progress_updated');
      socketClient.off('streak_updated');
      socketService.disconnect();
    };
  }, [token, user]);

  const progressRate = useMemo(() => dashboard?.summary?.completionRate || 0, [dashboard]);
  const weeklyData = dashboard?.charts?.weeklyHistory || [];

  const handleAddHabit = async (e) => {
    e.preventDefault();
    try {
      const habit = await fetchJson(`${API_BASE}/habits`, token, {
        method: 'POST',
        body: JSON.stringify(newHabit)
      });
      setHabits((prev) => [...prev, habit.habit]);
      setShowAdd(false);
      setNewHabit({ title: '', category: 'Productivity', icon: '✨' });
      setMessage('Habit created');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const toggleHabit = async (habitId) => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      await fetchJson(`${API_BASE}/habits/${habitId}/toggle`, token, {
        method: 'POST',
        body: JSON.stringify({ date, completed: true })
      });
      const refreshed = await fetchJson(`${API_BASE}/dashboard`, token);
      setDashboard(refreshed);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const isHabitCompleteToday = (habit) => {
    return dashboard?.todayHistory?.some((record) => record.habitId?.toString?.() === habit._id?.toString?.() && record.completed);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-4 sm:p-6">
      <header className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">trackkar.store</p>
          <h1 className="mt-2 text-3xl font-serif font-bold text-slate-900">Mindful Habits</h1>
          <p className="mt-2 text-sm text-slate-500">Welcome back, {user?.name || 'Tracker'} — your habits are safe and synced.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)} className="rounded-3xl bg-slate-900 text-white px-4 py-3 text-sm font-bold hover:bg-slate-800">Add Habit</button>
          <button onClick={onLogout} className="rounded-3xl bg-slate-100 text-slate-800 px-4 py-3 text-sm font-bold hover:bg-slate-200">Logout</button>
        </div>
      </header>

      {message && <div className="max-w-5xl mx-auto mb-4 rounded-3xl bg-slate-50 border border-slate-200 p-4 text-slate-700">{message}</div>}
      {loading ? (
        <div className="max-w-5xl mx-auto rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">Loading your dashboard…</div>
      ) : (
        <main className="max-w-5xl mx-auto space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Today progress</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">{dashboard?.summary?.todayProgress ?? 0}%</h2>
              <p className="mt-2 text-sm text-slate-500">{dashboard?.summary?.completedHabits ?? 0} completed of {dashboard?.summary?.totalHabits ?? 0} habits</p>
            </div>
            <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Weekly analytics</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">{dashboard?.summary?.weeklyProgress ?? 0}%</h2>
              <p className="mt-2 text-sm text-slate-500">Last 7 days completion rate</p>
            </div>
            <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Monthly momentum</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">{dashboard?.summary?.monthlyProgress ?? 0}%</h2>
              <p className="mt-2 text-sm text-slate-500">30-day trend and consistency</p>
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Monthly Trend Momentum</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">Overall completion rate</h3>
              </div>
              <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-2 text-xs font-semibold">{progressRate}% avg</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              {weeklyData.map((value, idx) => (
                <div key={idx} className="flex flex-col items-center text-center text-slate-500">
                  <span className="text-xs font-semibold mb-2">{dayLabels[idx]}</span>
                  <div className="h-24 w-full rounded-xl bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-xl bg-gradient-to-t from-slate-900 to-slate-500" style={{ height: `${Math.min(value, 100)}%` }} />
                  </div>
                  <span className="mt-2 text-sm font-semibold text-slate-700">{value}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Daily Matrix</p>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">Habit check-in</h3>
                </div>
                <span className="text-xs text-slate-500">Tap habit to complete today</span>
              </div>
              <div className="space-y-3">
                {habits.map((habit) => (
                  <div key={habit._id} className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 p-4 hover:border-slate-300 transition-colors cursor-pointer" onClick={() => toggleHabit(habit._id)}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{habit.icon || '✨'}</span>
                      <div>
                        <p className="font-semibold text-slate-900">{habit.title}</p>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{habit.category}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isHabitCompleteToday(habit) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {isHabitCompleteToday(habit) ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
                {!habits.length && <p className="text-sm text-slate-500">Add your first habit to start tracking daily progress.</p>}
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Categories</p>
              <div className="mt-4 grid gap-3">
                {dashboard?.categories?.map((item) => (
                  <div key={item.name} className="rounded-3xl border border-slate-100 p-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                      <span className="text-xs text-slate-500">{item.progress}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-slate-900 to-slate-500" style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{item.completed} completed • {item.total} records</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Recent activity</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">History & insights</h3>
              </div>
            </div>
            <div className="space-y-3">
              {dashboard?.recentActivity?.length ? dashboard.recentActivity.map((item) => (
                <div key={`${item.habitId}-${item.date}`} className="rounded-3xl border border-slate-100 p-4 bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{item.date}</span>
                    <span className={`text-xs font-semibold ${item.completed ? 'text-emerald-700' : 'text-rose-600'}`}>{item.completed ? 'Completed' : 'Missed'}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Habit activity record.</p>
                </div>
              )) : <p className="text-sm text-slate-500">Your habit history will appear here once you complete activities.</p>}
            </div>
          </section>
        </main>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-xl rounded-[32px] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-slate-900">Add a Habit</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddHabit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Title</label>
                <input value={newHabit.title} onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })} className="w-full rounded-3xl border border-slate-200 px-4 py-3" required />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Category</label>
                <select value={newHabit.category} onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })} className="w-full rounded-3xl border border-slate-200 px-4 py-3">
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Icon</label>
                <input value={newHabit.icon} onChange={(e) => setNewHabit({ ...newHabit, icon: e.target.value })} className="w-full rounded-3xl border border-slate-200 px-4 py-3" placeholder="Choose an emoji or symbol" />
                <p className="mt-2 text-xs text-slate-500">Pick a quick emoji or type your own symbol.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {habitIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewHabit({ ...newHabit, icon })}
                      className={`h-10 w-10 rounded-2xl border text-lg transition ${newHabit.icon === icon ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'}`}
                      aria-label={`Use ${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <button className="w-full rounded-3xl bg-slate-900 text-white py-3 text-sm font-bold hover:bg-slate-800">Create Habit</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { DashboardPage };
