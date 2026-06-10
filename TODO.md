# Trackkar Habit Tracker - TODO

## Current task: Build complete Authentication Module (React)

### Auth module implementation steps
- [x] Inspect existing frontend routing/auth flow (done: `frontend/app.js`, `frontend/auth/auth.js`).
- [x] Add new folder structure under `frontend/`:
  - [x] `frontend/auth/` (Login, Register, VerifyOtp, ForgotPassword, ResetPassword, AuthLayout, auth.js, auth.css)
  - [ ] `frontend/components/` (ProtectedRoute, PublicRoute, Navbar, Loader)
  - [x] `frontend/services/` (authService.js, socket.js, api.js)
- [x] Implement `frontend/services/authService.js` to call existing backend endpoints.
- [x] Implement shared Socket.IO singleton `frontend/services/socket.js` with `connect(user)`, `getSocket()`, `disconnect()`.
- [ ] Implement auth pages using modern SaaS UI:
  - [x] Loading states + error handling
  - [ ] OTP verification page with 6-digit UX
  - [ ] Forgot/Reset password flow + password strength indicator
  - [ ] Toast notifications + dark mode support
- [x] Add auth guards for hash routes:
  - [x] Redirect unauthenticated users away from dashboard/admin
  - [x] Redirect authenticated users away from auth pages
- [x] Refactor `frontend/app.js` to use hash routing + route guards.
- [x] Refactor `DashboardPage` to use shared socket singleton (remove direct socket creation).
- [x] Implement logout in `frontend/app.js`:
  - [x] socketService.disconnect()
  - [x] clear localStorage keys
  - [x] redirect to `#/auth/login`
- [ ] Verify full integration:
  - [ ] Register → verify OTP → dashboard redirect
  - [ ] Login → verify OTP → reconnect socket → dashboard loads data
  - [ ] Toggle habit updates dashboard via realtime events
  - [ ] Forgot password → reset OTP → reset password → login

### Notes
- Backend endpoints are assumed working as currently implemented in:
  - `/api/auth/*`
  - `/api/habits/*`
  - `/api/dashboard`

