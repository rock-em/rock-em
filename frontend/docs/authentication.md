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

## Forgotten passwords

The sign-in page links to `/forgot-password`. Users receive a link to
`/reset-password#token=…`, where they enter and confirm a new password. Tokens
stay in the URL fragment (not access logs or referrer headers) and are removed
from the current history entry after success. Users sign in again afterward.

- `POST /api/auth/forgot-password` accepts `{ "email": "..." }` and returns 202
  with the same generic acknowledgment for existing and unknown accounts.
- `POST /api/auth/reset-password` accepts `{ "token": "...", "newPassword": "..." }`
  and returns 204 on success, or 400 for an invalid/expired link or password.
- Tokens contain 32 cryptographically random bytes, are stored only as SHA-256
  hashes, expire after 30 minutes, and are consumed once in the same transaction
  as the password update. A new link replaces the previous link.
- Resetting a password revokes all sessions. Changing it while signed in also
  invalidates outstanding reset links.

### Enabling email delivery

An email provider sends transactional emails on the website's behalf. Choose a
provider offering SMTP submission with STARTTLS, verify a sending address/domain
with that provider, then configure these values in the API server environment:

- `SMTP_ADDR`: provider hostname and port, normally `hostname:587`.
- `SMTP_USERNAME` and `SMTP_PASSWORD`: provider-issued SMTP credentials.
- `SMTP_FROM`: verified sender, such as `rock em <accounts@your-domain.example>`.
- `PUBLIC_ORIGIN`: the site's HTTPS origin, such as `https://rockem.xyz`.

Keep credentials in the server's secret configuration, not the repository. Apply
migration `000006_password_resets` and restart the API after configuring delivery.
The API requires TLS for SMTP. Leaving `SMTP_ADDR` unset disables requests with
an explicit 503 response; the UI does not claim an email was sent in this case.

Requests are rate limited per IP, with an additional one-minute per-account email
cooldown. Delivery runs in a bounded background queue so response timing does not
reveal account existence. Delivery errors are logged without addresses or tokens;
the public response remains generic. The in-memory queue does not survive an API
restart, so users may need to request a link again if delivery is interrupted.
