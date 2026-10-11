# VigilNext Client - Week 1 Placeholder

Vite + React + TypeScript shell that shows API reachability.
The merchant dashboard and reviewer queue arrive in Week 4;
this page only calls `GET /api/health` (stripped to `/health`
by Caddy in prod, by the Vite proxy in dev).

## Setup

From this directory (`client/`):

1. `pnpm install`
2. `pnpm dev` (serves on http://localhost:5173, proxies `/api/*`
   to the API at http://localhost:3000)
3. `pnpm build` to verify the production bundle
