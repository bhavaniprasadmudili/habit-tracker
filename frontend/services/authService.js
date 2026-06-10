import { fetchJson, API_BASE } from './api.js';

function post(path, data) {
  return fetchJson(`${API_BASE}${path}`, null, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function register(payload) {
  return post('/auth/register', payload);
}

export function login(payload) {
  return post('/auth/login', payload);
}

export function forgotPassword(payload) {
  return post('/auth/forgot-password', payload);
}

export function verifyOtp(payload) {
  return post('/auth/verify-otp', payload);
}

export function resendOtp(payload) {
  return post('/auth/resend-otp', payload);
}

export function resetPassword(payload) {
  return post('/auth/reset-password', payload);
}
