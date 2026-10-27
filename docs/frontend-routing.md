# Frontend pages

The home page contains only the topic browser, sculpture, search, and problem list.
The shared Explore menu links to these supporting pages:

| Path | Content |
| --- | --- |
| `/learn` | Topic learning paths |
| `/progress` | Session summary and adaptive practice review |
| `/generate` | Problem generation form |
| `/about` | Project introduction |
| `/problems/:id` | Coding workspace |

Navigation uses the browser history API and preserves in-memory drafts, generated
problems, and topic selection. Base problem links can be opened directly. Generated
problems remain session-only; after a reload, unavailable problem links show a
recovery link instead of an empty workspace. Account pages use the same navigation.

## Nginx

These routes need the SPA entry point when opened directly or refreshed. Inside
the `rockem.xyz` server block, alongside the existing `/api/` proxy, configure:

```nginx
location ~ ^/(sign-in|sign-up|forgot-password|reset-password|learn|progress|generate|about|problems/[0-9]+)/?$ {
    try_files $uri /index.html;
}
```

Keep the `/api/` proxy and existing static-file handling unchanged. Validate with
`sudo nginx -t` before reloading. The live server uses
`/etc/nginx/sites-available/default`; deployment smoke checks request every page
route so missing route configuration causes a visible deployment failure.
