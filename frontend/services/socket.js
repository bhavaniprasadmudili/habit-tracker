import { io } from 'https://cdn.socket.io/4.8.1/socket.io.esm.min.js';

// Shared Socket.IO singleton.
// Ensures only one socket connection exists per logged-in session.

let socket = null;
let currentUserKey = null;
let listenersBound = false;
let cleanupFns = [];

function userKey(user) {
  // Use stable key so we don't reconnect unnecessarily.
  const id = user?.id || user?._id || '';
  const role = user?.role || '';
  return `${id}:${role}`;
}

function clearListeners() {
  cleanupFns.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
  cleanupFns = [];
  listenersBound = false;
}

function connect(user) {
  const key = userKey(user);
  if (!key || !user?.id) {
    // Not logged in.
    return null;
  }

  // If socket already connected for same user, reuse.
  if (socket && socket.connected && currentUserKey === key) {
    return socket;
  }

  // If socket exists but for different user, fully disconnect.
  if (socket) {
    try {
      socket.disconnect();
    } catch {}
    clearListeners();
    socket = null;
  }

  currentUserKey = key;

  socket = io('/', {
    auth: {
      userId: user.id,
      role: user.role,
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
  });

  // No listeners are bound here (Dashboard binds its own handlers).
  // We provide cleanup hooks via Dashboard.

  return socket;
}

function getSocket() {
  return socket;
}

function disconnect() {
  currentUserKey = null;
  clearListeners();

  if (socket) {
    try {
      socket.removeAllListeners();
    } catch {}
    try {
      socket.disconnect();
    } catch {}
  }

  socket = null;
}

// Allow modules (like Dashboard) to register cleanup callbacks for listeners.
function registerCleanup(fn) {
  cleanupFns.push(fn);
  listenersBound = true;
}

export const socketService = {
  connect,
  getSocket,
  disconnect,
  registerCleanup,
};

