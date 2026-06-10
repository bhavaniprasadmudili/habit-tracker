# TODO

## UI: dynamic working pages (Django templates + minimal JS)
- Create templates and routes under `/ui/<feature>/` for: auth, wallet, quiz, guess, spin, tasks, payouts, fraud, leaderboard, notifications.
- Add Django views to render those pages.
- Add minimal JS to call existing REST endpoints under `/api/<feature>/`.
- Add basic auth handling (JWT access token) in UI: store in memory/localStorage; attach as `Authorization: Bearer ...`.
- Verify pages load in browser; verify AJAX calls succeed (using dev server).
- Keep changes test-safe: ensure `python manage.py test` still passes.

