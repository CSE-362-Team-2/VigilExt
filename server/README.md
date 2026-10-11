# VigilNext Server - Week 1 Skeleton

Express + TypeScript API for the VigilNext risk-aware payment gateway.
Week 1 scope: merchant API-key auth, payment state machine, PostgreSQL
schema. No real charging yet.

See the root `README.md` and `docs/DESIGN.md` for the full picture.

## Setup

From this directory (`server/`):

1. `pnpm install`
2. Copy env: `cp ../.env.example ../.env` (or set `DATABASE_URL` directly)
3. Start Postgres: `docker compose up -d db` (from the repo root)
4. Migrate: `pnpm run migrate` (rerun prints `skip`)
5. Seed test merchant: `pnpm run seed:test-merchant`
6. Start API: `pnpm run dev`
7. Check health: `curl http://localhost:3000/health`

Type check: `pnpm run typecheck`. Production build: `pnpm run build`
(entrypoint `dist/src/server.js`, run with `pnpm start`).

## Auth

All `/v1/*` routes require header `x-api-key`.
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

Validation errors return 400, duplicate `idempotency_key` returns 409,
invalid transitions return 400 `invalid_transition`, malformed JSON
returns 400 `invalid_json`, unknown payment ids return 404.

## Layout

```
src/app.ts - Express factory
src/server.ts - entrypoint
src/db.ts - pg pool
src/types.ts - shared Merchant/PaymentRow types + Express augmentation
src/middleware/apiKeyAuth.ts - merchant auth
src/routes/payments.ts - payment endpoints
src/domain/paymentStates.ts - state machine
src/utils/apiKey.ts - SHA256 helper
scripts/migrate.ts - SQL runner
scripts/seedTestMerchant.ts - local test merchant
migrations/001_init.sql - merchants, payments, ledger_entries
```
