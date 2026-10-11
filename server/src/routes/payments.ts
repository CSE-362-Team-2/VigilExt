import { Router, type NextFunction, type Request, type Response } from 'express';
import { getPool } from '../db';
import { canTransition, type PaymentStatus } from '../domain/paymentStates';
import type { PaymentRow } from '../types';

export function isValidCurrency(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

async function loadPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.merchant) {
    res.status(401).json({ error: 'missing_api_key' });
    return;
  }
  if (!isValidUuid(req.params.id)) {
    res.status(404).json({ error: 'payment_not_found' });
    return;
  }

  try {
    const pool = getPool();
    const result = await pool.query<PaymentRow>(
      'SELECT id, merchant_id, amount, currency, status, idempotency_key, created_at, updated_at FROM payments WHERE id = $1 AND merchant_id = $2',
      [req.params.id, req.merchant.id],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'payment_not_found' });
      return;
    }
    req.payment = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

async function transitionPayment(
  req: Request,
  res: Response,
  next: NextFunction,
  target: PaymentStatus,
): Promise<void> {
  const payment = req.payment;
  if (!payment) {
    res.status(404).json({ error: 'payment_not_found' });
    return;
  }
  const from = payment.status;
  if (!canTransition(from, target)) {
    res.status(400).json({ error: 'invalid_transition', from, to: target });
    return;
  }
  try {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE payments SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, status, amount, currency',
      [target, payment.id],
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

interface CreatePaymentBody {
  amount?: unknown;
  currency?: unknown;
  idempotency_key?: unknown;
}

export function createPaymentsRouter(): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.merchant) {
      res.status(401).json({ error: 'missing_api_key' });
      return;
    }

    const { amount, currency, idempotency_key } = (req.body ?? {}) as CreatePaymentBody;
    if (!Number.isInteger(amount) || (amount as number) <= 0) {
      res.status(400).json({ error: 'invalid_amount' });
      return;
    }
    if (!isValidCurrency(currency)) {
      res.status(400).json({ error: 'invalid_currency' });
      return;
    }
    if (typeof idempotency_key !== 'string' || idempotency_key.length === 0) {
      res.status(400).json({ error: 'invalid_idempotency_key' });
      return;
    }

    try {
      const pool = getPool();
      const result = await pool.query(
        "INSERT INTO payments (merchant_id, amount, currency, status, idempotency_key) VALUES ($1, $2, $3, 'created', $4) RETURNING id, status, amount, currency",
        [req.merchant.id, amount, currency, idempotency_key],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err !== null && typeof err === 'object' && 'code' in err && err.code === '23505') {
        res.status(409).json({ error: 'idempotency_conflict' });
        return;
      }
      next(err);
    }
  });

  router.get('/:id', loadPayment, (req: Request, res: Response): void => {
    res.status(200).json(req.payment);
  });

  router.post('/:id/authorize', loadPayment, (req: Request, res: Response, next: NextFunction) => {
    const body = (req.body ?? {}) as { fail?: unknown };
    const target: PaymentStatus = body.fail === true ? 'failed' : 'authorised';
    void transitionPayment(req, res, next, target);
  });

  router.post('/:id/capture', loadPayment, (req: Request, res: Response, next: NextFunction) => {
    void transitionPayment(req, res, next, 'captured');
  });

  router.post('/:id/refund', loadPayment, (req: Request, res: Response, next: NextFunction) => {
    void transitionPayment(req, res, next, 'refunded');
  });

  return router;
}
