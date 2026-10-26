# Accounts and problem API

The API is served at `/api` on the same origin as the frontend. Apply migrations
`000001`, `000002`, and `000003` before starting this version. Existing problems remain
public; the new migration does not alter their IDs or content.

## Accounts

All request bodies are JSON with `Content-Type: application/json`. Errors have
shape `{"error":"message"}`. Unknown request fields and oversized bodies are
rejected. Responses containing account data are never cacheable.

| Method | Route | Body / behavior |
| --- | --- | --- |
| POST | `/api/auth/register` | `email`, `displayName`, `password`; creates a user and signs in (201) |
| POST | `/api/auth/login` | `email`, `password`; signs in (200) |
| GET | `/api/auth/me` | Current user (`id`, `email`, `displayName`, `role`); 401 when signed out |
| POST | `/api/auth/logout` | Revokes the current session; 204 |
| PUT | `/api/auth/password` | `currentPassword`, `newPassword`; revokes all sessions; 204, sign in again |

Emails are normalized to lowercase. Passwords must be 12–72 bytes; bcrypt cost 12
is used, with no silent truncation. Roles are assigned only by a database operator.
Sessions expire after seven days, are revocable, and only SHA-256 token hashes are
stored. Session cookies are HttpOnly, SameSite=Lax, and Secure by default. Set
`AUTH_COOKIE_SECURE=false` only for local HTTP development. Browser requests use
same-origin cookies automatically; do not store credentials or tokens in localStorage.
Cross-origin writes are rejected by Go's CrossOriginProtection. Preserve Host
when proxying through Nginx; do not enable permissive credentialed CORS.

Registration and login have bounded in-process limits by TCP peer address, not
untrusted forwarded headers. Password changes and generation are limited per
authenticated account.
Behind Nginx this means the application limit is shared by requests from that
proxy; add client-IP rate limiting at the trusted edge and size the application
limit for traffic before a public launch. Limits reset when the process restarts.

There is no email verification, forgotten-password email flow, OAuth, or MFA in
this implementation. The email is a login identifier, not proof of ownership.
Do not use unverified email addresses to grant admin access automatically.

## Administrator setup

Register normally, then run from `backend/` with operator `DATABASE_URL` in the
environment (never pass database credentials on the command line):

```sh
go run ./cmd/admin -email your-account@example.com -role admin
```

Use `-role user` to revoke privileges. Existing sessions observe role changes on
the next request. This command does not create accounts or assign passwords.

For scripted admin requests, sign in and retain the cookie jar:

```sh
# login.json contains {"email":"...","password":"..."}; keep it private.
curl --fail-with-body -c cookies.txt -H 'Content-Type: application/json' \
  --data-binary @login.json https://rockem.xyz/api/auth/login
curl --fail-with-body -b cookies.txt -H 'Content-Type: application/json' \
  --data-binary @problem.json https://rockem.xyz/api/problems
```

Cookie jars grant account access. Protect/remove the local files after use.

## Problem catalog

| Method | Route | Access / behavior |
| --- | --- | --- |
| GET | `/api/problems` | Public array; `limit` (1–100, default 50), `offset`, `q`, `topic`, `difficulty` |
| GET | `/api/problems/{slug}` | Public detail; 404 if missing or archived |
| POST | `/api/problems` | Admin; creates problem, 201 and Location header |
| PUT | `/api/problems/{slug}` | Admin; full replacement of editable fields |
| DELETE | `/api/problems/{slug}` | Admin; archives problem, 204; preserves user state |
| POST | `/api/problems/generate` | Signed-in users; existing generator contract, rate limited |

Example creation body:

```json
{
  "slug": "two-sum",
  "title": "Two Sum",
  "description": "Find two indices whose values sum to the target.",
  "difficulty": "easy",
  "topic": "arrays",
  "examples": [{"input":"[2,7], 9","output":"[0,1]"}],
  "constraints": ["At least two elements"],
  "starter": "function twoSum(nums, target) {\n}\n",
  "functionName": "twoSum"
}
```

Slugs use lowercase letters, numbers, and hyphens; `generate` is reserved.
Difficulty is `easy`, `medium`, or `hard`. Slugs remain reserved after archival.
Optional fields omitted in PUT reset to empty values. Duplicate slugs return 409,
invalid input 400, anonymous writes 401, and non-admin writes 403. No arbitrary
user ID or author ID is accepted in these requests.

## Saved state

`GET /api/me/problems` returns only the current user's saved states, newest first,
with `limit` and `offset`. Archived problems are excluded.

`PATCH /api/me/problems/{slug}` accepts either or both:

```json
{"bookmarked": true, "status": "in_progress"}
```

Statuses: `not_started`, `in_progress`, `completed`. Omitted fields are preserved.
Progress is self-reported practice state, not a server-verified judge result.
The API does not execute submitted code or claim verified completion.

The frontend account control supports signup, signin, and signout, enabling the
protected generator. The existing built-in practice catalog and local adaptive
practice history remain separate; they are not automatically migrated into the
server catalog. Catalog/progress API endpoints are ready for subsequent frontend
integration. No admin dashboard is included.

## Rollout and operations

This is a feature branch; apply the schema migration before deploying its binary.
No production database or deployment configuration has been changed. For rollback,
prefer reverting the binary while retaining the additive schema. The down migration
deletes account/session/progress data; use it only on disposable databases or with
a deliberate backup/restore plan. Periodically remove expired sessions with
`DELETE FROM sessions WHERE expires_at <= now()`; login also prunes that user's
expired sessions and retains at most ten recent sessions.

Integration tests use `TEST_DATABASE_URL` pointing to a disposable database with
all migrations applied. Run `go test ./...` and `go vet ./...` from `backend/`.

## Starter catalog

Migration `000003_seed_problems` adds six problems matching the frontend demo:
Two Sum, Valid Parentheses, Binary Search, Merge Two Sorted Lists, Maximum
Subarray, and Number of Islands. It includes descriptions, topics, difficulty,
examples, constraints, function names, and JavaScript starter code.

These are ordinary database records returned by `GET /api/problems`, editable
and removable through the admin API. No special hardcoded API response or
startup reseeding is involved. Applying normal migrations installs them on
existing and fresh databases. Matching slugs are skipped, including archived
entries, so existing content is never overwritten or resurrected.

IDs are assigned by the database and need not match the frontend demo IDs. The
demo's `solved` flags are not copied: completion belongs to each user. Executable
demo test cases are not copied because the catalog schema has no judge/test-case
storage yet. The frontend still uses its own temporary catalog.

Rolling back this data migration deliberately retains the problems to preserve
admin edits and user progress; it does not delete rows based solely on their slug.
