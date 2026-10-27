# API contract and generation

`openapi.json` is the editable OpenAPI 3.0 contract. Paths are unversioned. Its
required `info.version` is documentation metadata, not problem/test versioning.

Install the generation tool once and regenerate after changing the contract:

```sh
npm ci --prefix tools/openapi
./scripts/generate-api.sh
```

Generated files (commit them; don't edit them by hand):

- `backend/internal/apigen/api.gen.go`: Go models, server interface, parameter
  binding, route registration, and embedded spec, using pinned oapi-codegen.
- `frontend/src/api/schema.d.ts`: TypeScript request/response/path types from
  openapi-typescript. `frontend/src/api/client.ts` binds them to openapi-fetch.

The TypeScript generator is isolated in `tools/openapi` because it currently
requires TS 5 while the application uses TS 6. Both dependency trees are locked;
no peer-dependency overrides are needed.

The Go API actually uses the generated router. `backend/internal/server/api.go`
implements its interface and delegates to existing auth and business handlers.
Generated security annotations alone do not enforce authorization: those adapters
explicitly apply account/admin checks. Handler validation still enforces semantic
rules, such as complete language data and account ownership. Contract tests
validate the spec and representative responses. CI checks regeneration drift.

## Frontend examples

```ts
import { api } from "./api/client";

const { data: languages, error } = await api.GET(
  "/api/problems/{slug}/languages",
  { params: { path: { slug: "two-sum" } } },
);
// languages: string[] | undefined, e.g. ["javascript", "python"]

const result = await api.GET("/api/problems/{slug}", {
  params: { path: { slug: "two-sum" }, query: { language: "python" } },
});
```

The client uses same-origin cookies. It returns typed `{data, error, response}`;
HTTP errors do not throw by default, while transport failures can throw. Pass
`signal` to cancel stale editor requests. `problemCatalog.ts` provides optional
throwing wrappers. The picker accepts strings directly; no registry/label lookup.

## Implemented and stubbed

Accounts, public problem listing/detail/languages, admin problem CRUD/language
removal, saved state, health, and the existing JavaScript generator are implemented.

The following authenticated routes are deliberately stubs returning **501** with
`{"code":"not_implemented","error":"this endpoint is not implemented yet"}`:

- GET `/api/problems/{slug}/workspace`
- GET/PUT `/api/me/drafts/{slug}`
- POST `/api/runs`, GET `/api/runs/{id}`
- POST/GET `/api/submissions`, GET `/api/submissions/{id}`

They do not save code, create fake jobs, execute code, or mark submissions accepted.
The spec defines request shapes and the actual 501 responses, not fictional success
contracts. Implement persistence/execution first, add real success schemas, regenerate,
then connect the frontend. Generated interfaces make new/missing operations visible
at compile time. Execution will require an isolated runner outside the API process.
