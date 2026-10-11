# VigilNext - Risk-Aware Payment Gateway

Week 1: planning and skeleton. Monorepo with an Express API (`server/`),
a placeholder web client (`client/`), PostgreSQL, and Caddy as the local
reverse proxy. No real charging yet.

## Stack
- Node.js 22 + Express 4 + TypeScript 5 (`server/`)
- Vite + React 19 + TypeScript (`client/`, Week 1 placeholder page only)
- PostgreSQL 16 via Docker Compose, Caddy 2 as entrypoint
- pnpm for package management (per-package lockfiles)
- Plain SQL migrations

## Prerequisites

- [Node.js](https://nodejs.org/) (v22 or higher)
- [pnpm](https://pnpm.io/) (enable via Corepack: `corepack enable`)
- [Docker](https://www.docker.com/) & Docker Compose

## Environment Configuration

Create a `.env` file in the root directory (see `.env.example`):

```
POSTGRES_DB_NAME=vigilnext
POSTGRES_USER=vigilnext
POSTGRES_PASSWORD=vigilnext
POSTGRES_PORT=5432
API_PORT=3000
TEST_API_KEY=vigilnext_test_key_123
```

## Running for Development

1. Start the database:

```
docker compose up -d db
```

2. Install dependencies and start the server:

```
cd server
pnpm install
pnpm run migrate
pnpm run seed:test-merchant
pnpm dev
```

3. Install dependencies and start the client:

```
cd client
pnpm install
pnpm dev
```

- API: `http://localhost:3000` (health at `/health`)
- Client: `http://localhost:5173` (proxies `/api/*` to the API)

Type check the server with `pnpm run typecheck` (from `server/`).

## Running for Production

```
# Build and start all services in detached mode
docker compose up -d --build

# View real-time logs across all services
docker compose logs -f

# View logs for server only
docker compose logs -f server
```

Caddy serves the client on port 80 and proxies `/api/*` to the server
(prefix stripped, so `/api/health` reaches `/health`).

## Database Management

```
# Open interactive psql prompt
docker exec -it vigilext-db-1 psql -U vigilnext -d vigilnext
```

## Stopping and Cleaning up

```
# Stop containers
docker compose down

# Stop containers AND remove persistent database volumes
docker compose down -v
```

## Service Ports and Addresses

| Service | Local URL / Address | Container Port |
| --- | --- | --- |
| **Caddy (entrypoint)** | `http://localhost` | 80, 443 |
| **Client** | via Caddy only (dev: `http://localhost:5173`) | 80 |
| **Express API Server** | `http://localhost:3000`, `/api/*` via Caddy | 3000 |
| **PostgreSQL Database** | `postgres://localhost:5432` | 5432 |

## Auth

All `/v1/*` API routes require header `x-api-key`.
Missing key returns 401 `missing_api_key`. Unknown key returns 401
`invalid_api_key`. Only the SHA256 hash is stored in
`merchants.api_key_hash`.

## API Contract (v1 skeleton)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /health | Service check |
| GET | /v1/me | Current merchant |
| POST | /v1/payments | Create payment, status `created` |
| GET | /v1/payments/:id | Payment status |
| POST | /v1/payments/:id/authorize | `created` to `authorised` or `failed` |
| POST | /v1/payments/:id/capture | `authorised` to `captured` |
| POST | /v1/payments/:id/refund | `captured` to `refunded` |

Validation errors return 400. Duplicate `idempotency_key` for the same
merchant returns 409. Invalid state change returns 400
`invalid_transition`. Malformed JSON returns 400 `invalid_json`.
Unknown payment ids return 404 `payment_not_found`.

Details live in `server/README.md` and `docs/DESIGN.md`.

## Week 1 Exit Check
- `docker compose config` passes
- `pnpm run migrate` (from `server/`) applies `001_init.sql` cleanly, rerun shows `skip`
- `GET /health` returns 200
- `GET /v1/me` without key returns 401
- Full flow `created` to `authorised` to `captured` to `refunded` returns 200
- Invalid transition returns 400, never 500
