# VigilNext Design Document - Week 1

## 1. Goal
Build a payment gateway that sits between merchant checkout and a payment processor.
For Week 1 the scope is planning and skeleton only. No real charging, no risk scoring,
no dashboard. Exit gate: design approved, skeleton runs, schema migrates cleanly.

## 2. Requirements

Functional:
- Merchants authenticate with an API key.
- Merchants can create a payment, check status, authorize, capture, refund.
- Payment status follows a fixed state machine.
- All data is stored in PostgreSQL.

Non functional:
- Node.js + Express API, PostgreSQL 16, Docker Compose for local env.
- JSON API, stateless auth, input validation returns 4xx never 500 for bad input.
- Secrets via environment variables only.

Out of scope for Week 1:
- Sandbox processor, webhooks, idempotency enforcement, ledger posting,
  risk engine, OTP, reviewer UI. These arrive in Week 2 to Week 4.

## 3. Actors
- Customer: pays on merchant checkout. Does not call VigilNext directly in Week 1.
- Merchant: server side client. Holds API key. Calls VigilNext REST API.
- Reviewer: human operator. Defined here for future weeks. No endpoints yet.

## 4. Payment Flow (Week 1 skeleton)
1. Merchant calls `POST /v1/payments` with amount, currency, idempotency key.
2. VigilNext validates API key and input, creates row in `created` state.
3. Merchant calls authorize, then capture, then optionally refund.
4. Merchant polls `GET /v1/payments/:id` for current status.
5. Invalid state transitions are rejected with 400.

Full charging and ledger posting are Week 2 work. Week 1 endpoints validate
transitions and return stub responses backed by the state machine module.

## 5. Architecture
```
merchant checkout -> VigilNext API (Express) -> PostgreSQL
                         |
                    migrations + api key middleware
```
- `src/app.js`: Express app factory.
- `src/server.js`: process entrypoint.
- `src/routes/payments.js`: REST handlers.
- `src/middleware/apiKeyAuth.js`: merchant auth.
- `src/db.js`: pg pool.
- `src/domain/paymentStates.js`: allowed transitions.
- `scripts/migrate.js`: runs SQL files in `migrations/` in order.
- `docker-compose.yml`: `db` and `api` services.

## 6. REST API Contract (v1)

Auth: header `x-api-key: <merchant key>`. Missing or unknown key returns 401.

- `GET /health` -> `{ status: "ok", service: "vigilnext" }`
- `POST /v1/payments`
  Request: `{ amount: 1000, currency: "USD", idempotency_key: "abc-123" }`
  Response 201: `{ id, status: "created", amount, currency }`
- `GET /v1/payments/:id`
  Response 200: `{ id, status, amount, currency }`
- `POST /v1/payments/:id/authorize` -> `authorised` or `failed`
- `POST /v1/payments/:id/capture` -> `captured`
- `POST /v1/payments/:id/refund` -> `refunded`

Validation errors return 400 with `{ error }`. Unknown payment returns 404.
Week 1 implements contract and state validation. Persistence of full payment
lifecycle is completed in Week 2.

## 7. Database Schema

Tables: `merchants`, `payments`, `ledger_entries`.

`merchants`:
- `id UUID PRIMARY KEY`
- `name TEXT NOT NULL`
- `api_key_hash TEXT NOT NULL UNIQUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

`payments`:
- `id UUID PRIMARY KEY`
- `merchant_id UUID NOT NULL REFERENCES merchants(id)`
- `amount INTEGER NOT NULL CHECK (amount > 0)` in minor units
- `currency CHAR(3) NOT NULL`
- `status TEXT NOT NULL` one of `created, authorised, captured, failed, refunded`
- `idempotency_key TEXT NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `UNIQUE (merchant_id, idempotency_key)`

`ledger_entries` (reserved for Week 2 double entry posting):
- `id UUID PRIMARY KEY`
- `payment_id UUID NOT NULL REFERENCES payments(id)`
- `entry_type TEXT NOT NULL`
- `amount INTEGER NOT NULL CHECK (amount > 0)`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

See `migrations/001_init.sql` for the source of truth.

## 8. Payment State Machine
Allowed transitions:
- `created -> authorised`
- `created -> failed`
- `authorised -> captured`
- `authorised -> failed`
- `captured -> refunded`

All other transitions are invalid. Terminal states: `failed`, `refunded`.
Module: `src/domain/paymentStates.js` exports `canTransition(from, to)`.

## 9. Merchant API Key Authentication
- Keys are random strings issued out of band.
- Only SHA256 hash is stored in `merchants.api_key_hash`.
- Middleware reads `x-api-key`, hashes it, looks up merchant, attaches
  `req.merchant` on success, returns 401 otherwise.
- Rate limiting and key rotation are Week 4 work.

## 10. Local Environment
- Copy `.env.example` to `.env`.
- Run `docker compose up --build`.
- Run `npm run migrate` to apply schema.
- Check `GET http://localhost:3000/health`.
