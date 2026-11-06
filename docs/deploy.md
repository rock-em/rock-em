# Deployment

## Nginx

The frontend is a single-page app, so its routes need the SPA entry point when
opened directly or refreshed. Inside the `rockem.xyz` server block, alongside the
`/api/` proxy:

```nginx
location ~ ^/(sign-in|sign-up|forgot-password|reset-password|learn|progress|generate|about|problems/[a-z0-9]+(-[a-z0-9]+)*)/?$ {
    try_files $uri /index.html;
}
```

Validate with `sudo nginx -t` before reloading. The live server uses
`/etc/nginx/sites-available/default`. The deploy workflow requests each of these
routes after deploying, so a missing route fails the deployment. Add new routes to
both this block and `.github/workflows/deploy.yml`.
