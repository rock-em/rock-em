# API setup

See [the OpenAPI contract](../api/openapi.json) and [generation guide](../api/README.md)
for every route, parameter, input, response and stub. Apply migrations `000001`
through `000007` before deploying this branch's binary.

## Problem data

`GET /api/problems` returns only `slug`, `title`, `shortDescription`, `difficulty`,
and `category`. Filters: `q`, `category` (`topic` remains an alias), `difficulty`,
`limit` (default 50, maximum 100), and `offset`.

Each problem stores **one language-agnostic contract**: a typed `signature`, shared
`constraints`, a `compare` mode and JSON tests in `problem_tests`. Every language's
runner converts those JSON values into native types, so nothing is authored per
language except optional starter overrides.

```json
{
  "signature": {
    "function": "twoSum",
    "params": [{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}],
    "returns": "int[]"
  },
  "compare": "unordered",
  "tests": [
    {"kind": "example", "args": [[2,7,11,15], 9], "expected": [0,1]},
    {"kind": "hidden",  "args": [[3,3], 6],       "expected": [0,1]}
  ]
}
```

Types are `int`, `long`, `double`, `bool`, `string`, `char`, `ListNode` (an array of
values) and `TreeNode` (a level-order array with `null`s), plus up to three `[]`
suffixes. Every test's values must match the signature. All problems are 0-indexed.
`compare: "unordered"` checks array returns as multisets.

The `languages` table is the runtime registry (key, name, version, indent unit,
enabled). Keys match editor language ids (CodeMirror `lang-*`).
`GET /api/problems/two-sum/languages` lists enabled languages that can serve the
problem: it needs a signature, plus a starter generator in
`internal/problems/starters.go` or a stored override:

```json
["javascript", "python"]
```

`GET /api/problems/two-sum?language=python` returns the contract plus that
language's `functionName` (its naming convention, e.g. `two_sum`), plain-text
`starter` and `indentUnit`. `examples` are the example tests; `tests` lists examples
then public tests. Hidden tests are never returned. Omitted language defaults to
Python and never silently falls back: an unavailable one returns 404 with
`code: language_not_available` and `languages`. A missing problem has
`problem_not_found`. Code execution and submissions remain explicit stubs.

`category` is the primary topic and `topics` lists all of them, primary first. Topics
are shared by slug (`Hash Table` → `hash-table`), and the `category`/`topic` filters
match any of a problem's topics by name or slug.

## Admin writes

Create with POST `/api/problems`:

```json
{
  "slug": "two-sum",
  "title": "Two Sum",
  "shortDescription": "Find two distinct positions whose values sum to a target.",
  "description": "Return the indices of two different elements whose sum is the target.",
  "difficulty": "easy",
  "category": "Arrays",
  "topics": ["Hash Table"],
  "constraints": ["2 ≤ nums.length ≤ 10⁴"],
  "signature": {"function": "twoSum", "params": [{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}], "returns": "int[]"},
  "compare": "unordered",
  "tests": [{"kind": "example", "args": [[2,7], 9], "expected": [0,1], "explanation": "2 + 7 = 9"}],
  "starters": {"python": "def two_sum(nums: list[int], target: int) -> list[int]:\n    pass\n"}
}
```

A signature and 1–100 tests are required; `compare` defaults to `exact`. Only examples
may have an explanation. `starters` is optional and keyed by a registered language;
an unknown key returns 400. Unknown topics are created.

PUT `/api/problems/{slug}` replaces metadata, topics, signature and tests atomically.
Supplied starter overrides merge by key; omitted ones remain.
DELETE `/api/problems/{slug}/languages/{language}` removes that override so the
generated starter is served again (404 when there is none).
DELETE `/api/problems/{slug}` archives the entire problem while retaining user data.
POST/PUT return the lean summary. Duplicate slugs return 409, including archived ones.

Admin writes require an account promoted by a database operator. Register first,
then from `backend/` with operator DATABASE_URL in the environment:

```sh
go run ./cmd/admin -email you@example.com -role admin
```

Sign in through `/api/auth/login` and use its cookie for requests. Never put database
credentials or passwords in command-line arguments. `-role user` revokes admin rights.

## Accounts and saved state

Signup, signin, signout, current-user and password-change routes are documented in
OpenAPI. Passwords are bcrypt-hashed; sessions use random HttpOnly cookies with only
hashes stored in PostgreSQL. Cookies are Secure by default; set
`AUTH_COOKIE_SECURE=false` only for local HTTP. Password changes revoke all sessions.
Email verification, recovery email and MFA are not implemented.

GET `/api/me/problems` and PATCH `/api/me/problems/{slug}` support private bookmarks
and self-reported progress (`not_started`, `in_progress`, `completed`). This is not
a judge-verified accepted verdict. Unspecified state fields are preserved.

Requests must be same-origin; preserve Host in the reverse proxy. Registration/login
limits use peer IP (shared behind a proxy); configure client-IP limits at the edge.
Password changes and generation are limited per account. Expired sessions already
fail authentication; periodically delete them using
`DELETE FROM sessions WHERE expires_at <= now()` to reclaim storage.

## Migration and frontend boundaries

Historical migrations are unchanged. `000004`/`000005` added and seeded the old
per-language `languages` map. `000007` adds the contract tables (`languages`,
`topics`, `problem_topics`, `problem_tests`, `problem_starters`) and the `signature`
and `compare` columns. It backfills topics from `topic`, copies tests from one stored
variant (the leading tests become examples) and writes signatures for the unchanged
starter catalog. Other problems keep their tests but have no signature, so they offer
no languages until an admin PUTs one.

The old `languages` map and legacy columns are not written any more but are kept, so
rolling back `000007` loses nothing authored before it. `topic` mirrors the primary
topic. Drop the old columns in a later migration once this is deployed.

The frontend runs JavaScript in a sandboxed iframe and renders examples from
`args` with the signature's parameter names. Preserve editor drafts by
`(slug, language)`.

### Password recovery

`POST /api/auth/forgot-password` accepts `{ "email": "..." }` without a session.
It returns 202 with a generic `message`, irrespective of whether an account exists.
If email delivery is not configured, it returns 503. Requests are rate limited.

`POST /api/auth/reset-password` accepts `{ "token": "...", "newPassword": "..." }`
without a session. Tokens expire after 30 minutes and can be used once. A successful
204 response means the password was changed and all existing sessions were revoked;
users must log in again. Invalid/expired tokens and invalid passwords return 400.
Passwords must contain 12–72 UTF-8 bytes. See
`frontend/docs/authentication.md` for SMTP setup and delivery behavior.
