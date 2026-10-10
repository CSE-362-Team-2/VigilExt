# Vigil - Risk-Aware Payment Gateway

Week 1: planning and skeleton. Express API with merchant API key auth,
PostgreSQL schema, and payment state machine. No real charging yet.

## Stack
- Node.js 20 + Express 4
- PostgreSQL 16 via Docker Compose
- Plain SQL migrations

## Quick Start

1. Copy env:
   `cp .env.example .env`
2. Start Postgres:
   `docker compose up -d db`
3. Install deps:
   `npm install`
4. Migrate:
   `npm run migrate`
5. Seed test merchant:
   `npm run seed:test-merchant`
6. Start API:
   `npm run dev`
7. Check health:
   `curl http://localhost:3000/health`

Or run everything in Docker:
`docker compose up --build`

## Auth
All `/v1/*` routes require header `x-api-key`.
Missing key returns 401 `missing_api_key`. Unknown key returns 401 `invalid_api_key`.
Only the SHA256 hash is stored in `merchants.api_key_hash`.

Get current merchant:
`curl -H "x-api-key: $TEST_API_KEY" http://localhost:3000/v1/me`

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

Create example:
```
curl -X POST http://localhost:3000/v1/payments \
  -H "Content-Type: application/json" \
  -H "x-api-key: $TEST_API_KEY" \
  -d '{"amount":1000,"currency":"USD","idempotency_key":"order-1"}'
```

Validation errors return 400. Duplicate `idempotency_key` for the same
merchant returns 409. Invalid state change returns 400 `invalid_transition`.

Authorize with `{"fail": true}` moves to `failed` for skeleton testing.

## State Machine
Allowed:
- `created` to `authorised`, `failed`
- `authorised` to `captured`, `failed`
- `captured` to `refunded`

See `src/domain/paymentStates.js`. Terminal states: `failed`, `refunded`.

## Database
Tables: `merchants`, `payments`, `ledger_entries`.
`ledger_entries` is reserved for Week 2 double entry posting.
Migrations live in `migrations/`. Runner: `scripts/migrate.js`.

## Project Layout
```
src/app.js - Express factory
src/server.js - entrypoint
src/db.js - pg pool
src/middleware/apiKeyAuth.js - merchant auth
src/routes/payments.js - payment endpoints
src/domain/paymentStates.js - state machine
src/utils/apiKey.js - SHA256 helper
scripts/migrate.js - SQL runner
scripts/seedTestMerchant.js - local test merchant
docs/DESIGN.md - Week 1 design
```

## Week 1 Exit Check
- `docker compose config` passes
- `npm run migrate` applies `001_init.sql` cleanly, rerun shows `skip`
- `GET /health` returns 200
- `GET /v1/me` without key returns 401
- Full flow `created` to `authorised` to `captured` to `refunded` returns 200
- Invalid transition returns 400, never 500
