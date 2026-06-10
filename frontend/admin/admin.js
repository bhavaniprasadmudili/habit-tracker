import React from 'react';
import { fetchJson } from '../services/api.js';
const { useState, useEffect } = React;

function AdminLoginPage({ onLogin, navigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const data = await fetchJson('/api/admin/login', null, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      sessionStorage.setItem('trackkar_token', data.token);
      sessionStorage.setItem('trackkar_user', JSON.stringify(data.user));
      localStorage.removeItem('trackkar_token');
      localStorage.removeItem('trackkar_user');
      onLogin(data);
      // navigation handled by app.js route logic (avoid double redirects)
      // navigate('/admin/dashboard');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[32px] bg-white border border-slate-200 p-6 shadow-xl">
        <h1 className="text-3xl font-serif font-bold text-slate-900">Admin Console</h1>
        <p className="mt-2 text-sm text-slate-500">Enter admin credentials to review users and activity.</p>
        {message && <div className="mt-4 rounded-3xl bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">{message}</div>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</label>
            <input className="w-full rounded-3xl border border-slate-200 px-4 py-3" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Password</label>
            <input type="password" className="w-full rounded-3xl border border-slate-200 px-4 py-3" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button disabled={busy} className="w-full rounded-3xl bg-slate-900 text-white py-3 text-sm font-bold hover:bg-slate-800 disabled:opacity-60">{busy ? 'Signing in…' : 'Sign In'}</button>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard({ token, onLogout }) {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [analyticsData, usersData, activityData] = await Promise.all([
          fetchJson('/api/admin/analytics', token),
          fetchJson('/api/admin/users', token),
          fetchJson('/api/admin/activity', token)
        ]);
        setAnalytics(analyticsData);
        setUsers(usersData.users);
        setActivity(activityData.logs);
      } catch (err) {
        setMessage(err.message);
      }
    }
    load();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Admin Insights</p>
            <h1 className="mt-2 text-3xl font-serif font-bold text-slate-900">Platform Overview</h1>
          </div>
          <button onClick={onLogout} className="rounded-3xl bg-slate-900 text-white px-4 py-3 text-sm font-bold hover:bg-slate-800">Sign out</button>
        </div>
        {message && <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 text-slate-700">{message}</div>}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Users</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{analytics?.totalUsers ?? 0}</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">New regs (30d)</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{analytics?.newRegistrations ?? 0}</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Total habits</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{analytics?.totalHabits ?? 0}</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Avg completion</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{analytics?.avgCompletion ?? 0}%</p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Top users by habit count</p>
            <div className="mt-4 space-y-3">
              {analytics?.topUsers?.map((userItem, idx) => (
                <div key={userItem._id} className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 p-4">
                  <span className="text-sm font-semibold text-slate-900">User {idx + 1}</span>
                  <span className="text-xs text-slate-500">{userItem.total} habits</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Activity feed</p>
            <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto">
              {activity?.map((item) => (
                <div key={item._id} className="rounded-3xl border border-slate-100 p-4 bg-slate-50">
                  <p className="text-sm text-slate-900">{item.action}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              ))}
              {!activity?.length && <p className="text-sm text-slate-500">No activity logs yet.</p>}
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Users</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Habits</th>
                  <th className="px-4 py-3">Completion</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((userRow) => (
                  <tr key={userRow._id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{userRow.name}</td>
                    <td className="px-4 py-3">{userRow.email || userRow.phone}</td>
                    <td className="px-4 py-3">{userRow.verified ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{userRow.totalHabits}</td>
                    <td className="px-4 py-3">{userRow.completionPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminApp({ onLogin, onLogout, navigate }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('trackkar_token') || localStorage.getItem('trackkar_token'));
  const [user, setUser] = useState(() => {
    const raw = sessionStorage.getItem('trackkar_user') || localStorage.getItem('trackkar_user');
    try { return JSON.parse(raw); } catch { return null; }
  });

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    onLogout();
  };

  if (!token || !user || user.role !== 'admin') {
    return <AdminLoginPage onLogin={(data) => { setToken(data.token); setUser(data.user); onLogin(data); }} navigate={navigate} />;
  }

  return <AdminDashboard token={token} onLogout={handleLogout} />;
}

export { AdminApp, AdminLoginPage };
