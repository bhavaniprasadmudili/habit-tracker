# Trackkar Habit Tracker

A full-stack habit tracker with credential-based authentication, MongoDB persistence, real-time updates, analytics, and admin dashboard.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Add `EMAIL_USER` and `EMAIL_PASS` to enable password reset emails, and optionally set `FRONTEND_URL` for reset links.
3. Run `npm install`.
4. Start with `npm run dev` or `npm start`.

## Folder structure

- `backend/` - Express API, models, auth, analytics, realtime.
- `frontend/` - Static React-powered frontend with auth and dashboard.

## Notes

- The frontend preserves the existing UI design from the static `trackkar_habit_tracker_dashboard (1).html` file.
- Admin panel is available at `/admin/login`.
- Users authenticate with email and password and receive a JWT for protected routes.
