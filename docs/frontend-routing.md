# Frontend pages

The home page contains only the topic browser, sculpture, search, and problem list.
The shared Explore menu links to these supporting pages:

| Path | Content |
| --- | --- |
| `/learn` | Topic learning paths |
| `/progress` | Session summary and adaptive practice review |
| `/generate` | Problem generation form |
| `/about` | Project introduction |
| `/problems/:slug` | Coding workspace |

Navigation uses the browser history API and preserves in-memory drafts, generated
problems, and topic selection. API problem links can be opened directly; summaries are loaded from the paginated catalog, and details/languages are fetched on demand. Generated
problems remain session-only; after a reload, unavailable problem links show a
recovery link instead of an empty workspace. Account pages use the same navigation.

## Nginx

These routes need the SPA entry point when opened directly or refreshed. Inside
the `rockem.xyz` server block, alongside the existing `/api/` proxy, configure:

```nginx
location ~ ^/(sign-in|sign-up|forgot-password|reset-password|learn|progress|generate|about|problems/[a-z0-9]+(-[a-z0-9]+)*)/?$ {
    try_files $uri /index.html;
}
```

Keep the `/api/` proxy and existing static-file handling unchanged. Validate with
`sudo nginx -t` before reloading. The live server uses
`/etc/nginx/sites-available/default`; deployment smoke checks request every page
route so missing route configuration causes a visible deployment failure.

## Catalog data

The browser, learning paths, and review page use `GET /api/problems` summaries.
All summary pages are fetched; problem statements and code are not downloaded
until a workspace opens. Topic names come from each summary's `category`.
Workspace routes use stable slugs. The workspace requests the language list, then
fetches that language's detail with `?language=...`. It prefers Python when
available and otherwise selects an advertised language. Drafts are keyed by
slug and language and survive in-app navigation. Catalog failures and empty
results have explicit states, with no hardcoded fallback or pre-solved problems.

The local sample runner only executes JavaScript and compares JSON values exactly;
it is not a complete judge for custom data structures or alternative valid outputs.
Other advertised languages can be edited but not executed until the backend run
service is implemented. Session-generated problems still come from the generator
API and remain in memory. Completion counts refer to this browser session.
