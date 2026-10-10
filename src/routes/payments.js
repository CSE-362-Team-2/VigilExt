const express = require('express');
const { getPool } = require('../db');
const { canTransition } = require('../domain/paymentStates');

function isValidCurrency(value) {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

async function loadPayment(req, res, next) {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, merchant_id, amount, currency, status, idempotency_key, created_at, updated_at FROM payments WHERE id = $1 AND merchant_id = $2',
      [req.params.id, req.merchant.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'payment_not_found' });
    }
    req.payment = result.rows[0];
    return next();
  } catch (err) {
    return next(err);
  }
}

async function transitionPayment(req, res, next, target) {
  const from = req.payment.status;
  if (!canTransition(from, target)) {
    return res.status(400).json({ error: 'invalid_transition', from, to: target });
  }
  try {
    const pool = getPool();
    const result = await pool.query(
      "UPDATE payments SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, status, amount, currency",
      [target, req.payment.id]
    );
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

function createPaymentsRouter() {
  const router = express.Router();

  router.post('/', async (req, res, next) => {
    const { amount, currency, idempotency_key } = req.body || {};
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: 'invalid_amount' });
    }
    if (!isValidCurrency(currency)) {
      return res.status(400).json({ error: 'invalid_currency' });
    }
    if (typeof idempotency_key !== 'string' || idempotency_key.length === 0) {
      return res.status(400).json({ error: 'invalid_idempotency_key' });
    }

    try {
      const pool = getPool();
      const result = await pool.query(
        "INSERT INTO payments (merchant_id, amount, currency, status, idempotency_key) VALUES ($1, $2, $3, 'created', $4) RETURNING id, status, amount, currency",
        [req.merchant.id, amount, currency, idempotency_key]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err && err.code === '23505') {
        return res.status(409).json({ error: 'idempotency_conflict' });
      }
      return next(err);
    }
  });

  router.get('/:id', loadPayment, (req, res) => {
    return res.status(200).json(req.payment);
  });

  router.post('/:id/authorize', loadPayment, (req, res, next) => {
    const target = req.body && req.body.fail === true ? 'failed' : 'authorised';
    return transitionPayment(req, res, next, target);
  });

  router.post('/:id/capture', loadPayment, (req, res, next) => {
    return transitionPayment(req, res, next, 'captured');
  });

  router.post('/:id/refund', loadPayment, (req, res, next) => {
    return transitionPayment(req, res, next, 'refunded');
  });

  return router;
}

module.exports = { createPaymentsRouter };
