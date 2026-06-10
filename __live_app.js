import React from 'https://esm.sh/react@18.3.1';
import ReactDOM from 'https://esm.sh/react-dom@18.3.1/client';
import { AuthFlow } from './auth/auth.js';
import { DashboardPage } from './dashboard/dashboard.js';
import { AdminApp } from './admin/admin.js';
import { socketService } from './services/socket.js';

const { useState, useEffect } = React;

function getStoredToken() {
  return localStorage.getItem('trackkar_token');
}

function getStoredUser() {
  const raw = localStorage.getItem('trackkar_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function getRouteFromHash() {
  const hash = window.location.hash || '#/auth/login';
  return hash.startsWith('#') ? hash.slice(1) : hash;
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
    const normalized = path.startsWith('/') ? path : `/${path}`;
    window.location.hash = normalized;
    setRoute(normalized);
  };

  const logout = () => {
    socketService.disconnect();
    localStorage.removeItem('trackkar_token');
    localStorage.removeItem('trackkar_user');
    setToken(null);
    setUser(null);
    navigate('/auth/login');
  };

  const handleLogin = (authResult) => {
    localStorage.setItem('trackkar_token', authResult.token);
    localStorage.setItem('trackkar_user', JSON.stringify(authResult.user));
    setToken(authResult.token);
    setUser(authResult.user);
    if (authResult.user?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    if (!token && route.startsWith('/dashboard')) {
      navigate('/auth/login');
    }
    if (!token && route.startsWith('/admin')) {
      navigate('/admin/login');
    }
    if (token && route.startsWith('/auth')) {
      if (user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [route, token, user]);

  if (route.startsWith('/admin')) {
    return <AdminApp onLogin={handleLogin} navigate={navigate} />;
  }

  if (!token) {
    return <AuthFlow onAuthenticated={handleLogin} navigate={navigate} />;
  }

  return <DashboardPage token={token} user={user} onLogout={logout} navigate={navigate} />;
}

// Mounting is handled by frontend/index.html

root.render(<App />);
