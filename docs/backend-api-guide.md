# Backend API integration guide

This guide describes the backend contract consumed by Rock Em's frontend. It is
based on the generated OpenAPI types and frontend implementation from the
November 26, 2026 source snapshot (`7e11acf`). Server implementation, database
schema, deployment topology and backend startup commands are not covered because
those files were not available for this review. Check the server source before
assuming the deployed API matches this snapshot.

## Architecture and request flow

```text
React pages and feature hooks
        |
        v
Feature API adapters (auth, problems, generate)
        |
        v
Typed openapi-fetch client (src/api/client.ts)
        |
        v
Same-origin /api requests
        |
        v
Backend HTTP API
```

In development, Vite forwards `/api` requests to `http://127.0.0.1:8080`.
The API client uses the current origin by default and same-origin credentials.
Authentication adapters explicitly include credentials on account requests.
The generated `frontend/src/api/schema.d.ts` provides request and response types.
It should not be edited by hand. The frontend's `npm run generate:api` script
invokes the generator under `tools/openapi` from the repository root.

## Endpoint reference

Paths below are relative to the application's origin. A slug identifies a
catalog problem; language identifiers select a language-specific starter.

| Method | Path                                        | Purpose                                                     |
| ------ | ------------------------------------------- | ----------------------------------------------------------- |
| GET    | `/api/health`                               | Health check; 503 indicates database unavailability.        |
| POST   | `/api/auth/register`                        | Create an account and set a session cookie.                 |
| POST   | `/api/auth/login`                           | Authenticate and set a session cookie.                      |
| POST   | `/api/auth/logout`                          | End the current session.                                    |
| GET    | `/api/auth/me`                              | Retrieve the current user.                                  |
| PUT    | `/api/auth/password`                        | Change the password.                                        |
| POST   | `/api/auth/forgot-password`                 | Request an expiring password reset email.                   |
| POST   | `/api/auth/reset-password`                  | Consume a reset token, change password and revoke sessions. |
| GET    | `/api/catalog`                              | Retrieve the compact published problem catalog.             |
| GET    | `/api/problems`                             | List problems.                                              |
| GET    | `/api/problems/{slug}`                      | Retrieve problem details for a language.                    |
| GET    | `/api/problems/{slug}/languages`            | List enabled languages for a problem.                       |
| POST   | `/api/problems`                             | Create a problem (admin).                                   |
| PUT    | `/api/problems/{slug}`                      | Update a problem (admin).                                   |
| DELETE | `/api/problems/{slug}`                      | Delete a problem (admin).                                   |
| DELETE | `/api/problems/{slug}/languages/{language}` | Remove a starter override (admin).                          |
| GET    | `/api/me/problems`                          | List saved problem states; supports limit and offset.       |
| PATCH  | `/api/me/problems/{slug}`                   | Update a saved problem state.                               |
| POST   | `/api/problems/generate`                    | Generate a JavaScript demo problem.                         |

The following authenticated routes are explicitly documented as stubs in the
snapshot. They return HTTP 501 with `not_implemented` and must not be treated as
working persistence or execution services.

| Method    | Path                             |
| --------- | -------------------------------- |
| GET       | `/api/problems/{slug}/workspace` |
| GET, PUT  | `/api/me/drafts/{slug}`          |
| POST      | `/api/runs`                      |
| GET       | `/api/runs/{id}`                 |
| GET, POST | `/api/submissions`               |
| GET       | `/api/submissions/{id}`          |

## Authentication and account recovery

Registration accepts an email, display name and password. Login and registration
set an HttpOnly session cookie; password length limits use UTF-8 bytes. The
frontend calls `/api/auth/me` to restore the session and treats a 401 response as
signed out. The user type exposes an ID, email, display name and a user or admin
role. The server contract requires admin privileges for catalog mutations;
frontend controls alone must not be relied on for authorization.

Password recovery sends an email address to the forgot-password endpoint. The
contract does not disclose whether an account exists. The frontend expects a
202 JSON response. The reset endpoint accepts `token` and `newPassword`; the
frontend expects 204. The contract specifies single-use tokens and revocation
of all sessions. Never include real passwords, cookies or reset tokens in
screenshots, issue reports or documentation.

## Catalog and workspace

The catalog endpoint returns all published problems in a compact response. Topic
references are indexes into the shared topic array, with the primary topic first.
The client performs browsing, filtering and sorting. The contract describes
ETag-based conditional requests (304 for an unchanged response) and gzip when
accepted by the client.

The workspace requests enabled languages and problem details separately. The
problem detail endpoint defaults to Python if no language is specified; a missing
or disabled language returns 404 with `language_not_available` and available
languages rather than silently falling back. Problem creation requires a signature
and at least one compatible test; updates preserve omitted starter overrides.

## Browser-side practice versus backend services

The snapshot's workspace executes JavaScript sample tests in a sandboxed iframe
using `frontend/src/features/workspace/runner.ts`. This is a demo runner, not a
production-grade secure judge. The runner sets a three-second timeout callback
and checks the source and token of result messages. Do not interpret this as a
hard isolation or execution-time guarantee.

`useSolution.ts` records submitted attempts and marks passed sample tests as
solved through frontend practice state. `progress/attempts.ts` stores attempt
statistics in browser storage. These are not evidence of server-side submission
records. The saved-problem API contract is separate from this local practice
tracking. The generator is also separate from the stored catalog.

## Local integration and troubleshooting

1. Start the backend using the server project's documented startup procedure.
2. Confirm it listens on port 8080, or adjust the Vite proxy for your local setup.
3. From `frontend`, run `npm ci` and `npm run dev` (Node 24 is required by the
   frontend package manifest).
4. Check the health and catalog endpoints before debugging the React UI:

   ```powershell
   curl.exe -i http://127.0.0.1:8080/api/health
   curl.exe -i http://127.0.0.1:8080/api/catalog
   ```

5. Use the browser Network panel to inspect `/api` requests without exposing
   session cookies or sensitive request bodies.

| Symptom                           | What to check                                   |
| --------------------------------- | ----------------------------------------------- |
| `ECONNREFUSED 127.0.0.1:8080`     | Backend process and configured port.            |
| 401                               | Session state and cookie handling.              |
| 404 with `language_not_available` | Available languages for the problem.            |
| 429 during password recovery      | Respect the rate limit and retry later.         |
| 501 with `not_implemented`        | Endpoint is a documented stub in this snapshot. |
| 503 on health check               | Backend database connectivity.                  |
| Unexpected HTML instead of JSON   | Proxy routing or SPA fallback.                  |

## Maintaining the contract

When an endpoint changes, update the authoritative server OpenAPI definition,
regenerate the frontend types, and update the relevant feature adapter and
integration tests. The shared `ApiError` class exposes status, error code and
available languages; adapters should preserve meaningful error information.
Run frontend lint, tests and build before merging contract changes.

### Source map

- `frontend/src/api/schema.d.ts`: generated endpoint and data contracts.
- `frontend/src/api/client.ts`: typed client and shared error handling.
- `frontend/src/features/auth/api.ts`: account and password recovery adapters.
- `frontend/src/features/problems/api.ts`: catalog, details and languages.
- `frontend/src/features/generate/api.ts`: generator adapter.
- `frontend/src/features/workspace/runner.ts`: browser demo execution.
- `frontend/src/features/workspace/useSolution.ts`: submission UI behavior.
- `frontend/src/features/progress/attempts.ts`: local attempt statistics.
- `frontend/vite.config.ts`: development proxy.
- `frontend/package.json`: Node requirements and API generation command.
