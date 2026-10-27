# Account UI integration

Shared top-right navigation links to `/sign-in` and `/sign-up`. Hosting must serve
those paths through the SPA entry point. Practice state remains mounted when
visiting account pages.

The UI uses the backend's cookie-based authentication:

| Endpoint | Request | Success |
| --- | --- | --- |
| `GET /api/auth/me` | — | User object, or 401 for guests |
| `POST /api/auth/login` | `{ "email": "...", "password": "..." }` | User object and session cookie |
| `POST /api/auth/register` | `{ "displayName": "...", "email": "...", "password": "..." }` | User object and session cookie |
| `POST /api/auth/logout` | `{}` | 204; invalidates session cookie |

User objects contain `id`, `displayName`, `email`, and `role`. The profile shows
the display name, email, and admin status when applicable. Registration requires
a display name of 1–80 bytes and a password of 12–72 bytes; the backend validates
byte limits and returns errors displayed by the form. Passwords and profile data
are not persisted to browser storage. See `docs/api.md` for the backend contract.
