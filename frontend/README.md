# CloudGuard frontend

The Next.js 16 (App Router) user interface for CloudGuard. For the whole
project — architecture, setup, API reference and known issues — see the
[root README](../Readme.md).

## Running it

The supported way is the Compose stack from the repository root, which brings up
PostgreSQL, MongoDB, the API and this app together:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

To run only this app against an API you started yourself:

```bash
npm install
```

Create `frontend/.env.local`:

```env
BACKEND_INTERNAL_URL=http://localhost:8000
```

```bash
npm run dev
```

> **Set no `NEXT_PUBLIC_BACKEND_URL` or `NEXT_PUBLIC_BACKEND` value.**
> With both unset, `lib/api.ts` calls the relative path `/backend`, which
> `next.config.ts` rewrites to `BACKEND_INTERNAL_URL` on the server. Every
> request is then same-origin and no CORS check applies. Setting either variable
> makes the browser call the API cross-origin from a tenant subdomain, which the
> API's CORS policy may refuse.

## Reaching the UI

The tenant comes from the hostname, not from a path:

| URL | Context |
| --- | --- |
| `http://localhost:3000/rootLogin` | Platform operator |
| `http://<slug>.localhost:3000/login` | Organization user |

Browsers resolve `*.localhost` to `127.0.0.1` with no hosts-file change.

## Layout

```text
app/
  (public)/    Landing page and auth pages
  (org)/       Organization-scoped pages
  (admin)/     Platform operator pages
components/    Shared React components
lib/
  api.ts       Typed API client, token refresh, tenant slug resolution
  props.ts     Shared TypeScript types
  routes.ts    Public and protected route lists
  session.ts   Token and permission storage
proxy.ts       URL rewrites for nested routes
```

## Checks

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

```bash
npm run build
```

CI runs all three on every pull request.

## Notes for contributors

- Session tokens live in `localStorage` (see `lib/session.ts`). Any XSS flaw can
  read them, so be careful with `dangerouslySetInnerHTML` and with rendering
  values that came from a scan target.
- Never read credentials from a URL. A `#session=` fragment handler used to
  exist here and was removed because it allowed session fixation.
- `lib/api.ts` attaches the `X-Tenant-Slug` header. The API treats it as a
  confirmation of the token's organization, never as a selector, so sending a
  different slug is rejected rather than honoured.
