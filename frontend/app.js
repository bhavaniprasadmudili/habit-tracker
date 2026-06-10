import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthFlow } from './auth/auth.js';
import { DashboardPage } from './dashboard/dashboard.js';
import { AdminApp } from './admin/admin.js';
import { socketService } from './services/socket.js';

const { useState, useEffect } = React;

function getStoredToken() {
  return sessionStorage.getItem('trackkar_token') || localStorage.getItem('trackkar_token');
}

function getStoredUser() {
  const raw = sessionStorage.getItem('trackkar_user') || localStorage.getItem('trackkar_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const USER_ROUTES = ['/home', '/dashboard', '/profile', '/settings'];
const ADMIN_ROUTES = ['/admin/login', '/admin/dashboard', '/admin/users', '/admin/settings'];
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

function normalizeRoute(route) {
  if (!route) return '/auth/login';
  const path = route.startsWith('#') ? route.slice(1) : route;
  const trimmed = path.replace(/\/+$|^\s+|\s+$/g, '');
  if (AUTH_ROUTES.some((item) => trimmed === item || trimmed.startsWith(`${item}/`))) return trimmed;
  if (ADMIN_ROUTES.some((item) => trimmed === item || trimmed.startsWith(`${item}/`))) return trimmed;
  if (USER_ROUTES.some((item) => trimmed === item || trimmed.startsWith(`${item}/`))) return trimmed;
  if (trimmed.startsWith('/admin')) return '/admin/login';
  return '/auth/login';
}

function getRouteFromHash() {
  const hash = window.location.hash || '#/auth/login';
  return normalizeRoute(hash.startsWith('#') ? hash.slice(1) : hash);
}

export function App() {
  const [route, setRoute] = useState(getRouteFromHash());
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    const handleHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path) => {
    const normalized = normalizeRoute(path.startsWith('#') ? path.slice(1) : path);
    window.location.hash = normalized;
    setRoute(normalized);
  };

  const logout = () => {
    socketService.disconnect();
    sessionStorage.removeItem('trackkar_token');
    sessionStorage.removeItem('trackkar_user');
    localStorage.removeItem('trackkar_token');
    localStorage.removeItem('trackkar_user');
    setToken(null);
    setUser(null);
    navigate('/auth/login');
  };

  const handleLogin = (authResult) => {
    sessionStorage.setItem('trackkar_token', authResult.token);
    sessionStorage.setItem('trackkar_user', JSON.stringify(authResult.user));
    localStorage.setItem('trackkar_token', authResult.token);
    localStorage.setItem('trackkar_user', JSON.stringify(authResult.user));
    setToken(authResult.token);
    setUser(authResult.user);
    if (authResult.user?.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/home');
    }
  };

  useEffect(() => {
    const isAuthRoute = route.startsWith('/auth');
    const isAdminRoute = route.startsWith('/admin');
    const isUserRoute = USER_ROUTES.some((item) => route.startsWith(item));

    if (!token) {
      if (isAdminRoute) {
        navigate('/admin/login');
        return;
      }
      if (!isAuthRoute) {
        navigate('/auth/login');
      }
      return;
    }

    if (token && isAuthRoute) {
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
      return;
    }

    if (token && isAdminRoute && user?.role !== 'admin') {
      navigate('/home');
      return;
    }

    if (token && !isAdminRoute && !isAuthRoute && !isUserRoute) {
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    }
  }, [route, token, user]);

  if (route.startsWith('/admin')) {
    return <AdminApp onLogin={handleLogin} onLogout={logout} navigate={navigate} />;
  }

  if (!token) {
    return <AuthFlow onAuthenticated={handleLogin} />;
  }

  return <DashboardPage token={token} user={user} onLogout={logout} navigate={navigate} />;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}

