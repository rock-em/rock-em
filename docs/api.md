# API setup

See [the OpenAPI contract](../api/openapi.json) and [generation guide](../api/README.md)
for every route, parameter, input, response and stub. Apply migrations `000001`
through `000005` before deploying this branch's binary.

## Problem data

`GET /api/problems` returns only `slug`, `title`, `shortDescription`, `difficulty`,
and `category`. Filters: `q`, `category` (`topic` remains an alias), `difficulty`,
`limit` (default 50, maximum 100), and `offset`.

Each problem row has **one `languages` JSONB map**. Canonical lowercase language
names are keys. Values contain all that language's requirements, examples,
constraints, public tests, starter code, function name and indexing convention.
There is no language registry, label mapping, publication state, or capabilities
object. A key exists only when complete language data is provided. API validation
and a database check reject empty/incomplete values.

```json
{
  "python": {
    "requirements": ["Return zero-based indices in either order."],
    "examples": [{"input":"nums = [2,7], target = 9","output":"[0,1]"}],
    "constraints": ["2 <= len(nums) <= 10000"],
    "tests": [{"input":[[2,7],9],"expected":[0,1]}],
    "starter": "def two_sum(nums, target):\n    pass\n",
    "functionName": "two_sum",
    "indexBase": 0
  }
}
```

`GET /api/problems/two-sum/languages` extracts and sorts the keys directly:

```json
["javascript", "python"]
```

Populate the selector from those strings. A saved preference is usable only if
listed; otherwise prefer Python if listed, or ask for a choice. Empty map means
`[]` and an unavailable picker. Missing/archived problems return 404.

`GET /api/problems/two-sum?language=python` returns common metadata plus only the
selected language's fields. Omitted language defaults to Python; it never silently
falls back. If a key is absent, return 404 with `code: language_not_available` and
`languages` containing current choices. A missing problem has `problem_not_found`.

Input/test values use JSON. The test's expected value is authored for that language:
a Python index pair might be `[0,1]`, while Julia's is `[1,2]`. The API does not
blindly shift numbers based on `indexBase`. Requirements describe conversions such
as JSON arrays to linked-list nodes. Constraints are display strings, not executable
validation. Public practice cases are not hidden judge tests. Code execution and
submissions remain explicit stubs regardless of which language data is present.

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
  "languages": {
    "python": {
      "requirements": [],
      "examples": [],
      "constraints": [],
      "tests": [{"input":[[2,7],9],"expected":[0,1]}],
      "starter": "def two_sum(nums, target):\n    pass\n",
      "functionName": "two_sum",
      "indexBase": 0
    }
  }
}
```

At least one complete language is required to create a problem. The language name
must be lowercase and match `^[a-z][a-z0-9_+-]{0,31}$`; use one consistent name per
language (`python`, `javascript`, `julia`, etc.), not aliases. No registration step.
Each language requires starter code, function name, explicit nonnegative index base
and 1–100 tests with an argument array and expected JSON value. Omitted optional
arrays normalize to `[]`. Missing fields/unknown request properties return 400.

PUT `/api/problems/{slug}` replaces common metadata and merges supplied language
keys atomically. Each supplied value replaces that language's complete value;
omitted languages remain intact. DELETE `/api/problems/{slug}/languages/{language}`
removes one key. Subsequent discovery/detail immediately reflect that removal.
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

Historical migrations `000001`–`000003` are unchanged. `000004` adds the map and
short description. `000005` populates complete Python/JavaScript entries for unchanged
starter problems. It compares original content, so customizations aren't overwritten.
Legacy fields remain for rollback, but new writes target the map. Custom old problems
have an empty map until an admin supplies complete language data; their old content
is retained in the legacy columns. Don't run old admin writers alongside this API.

Schema rollback deletes the map, so export authored data first. Data rollback retains
content. No production database changes have been applied by this task.

The existing frontend uses its temporary catalog/JavaScript runner. A typed client and
simple language selector are ready, but connecting a complete API-backed workspace is
separate from these stubs. Preserve editor drafts by `(slug, language)` when integrating.
