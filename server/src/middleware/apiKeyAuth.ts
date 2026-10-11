import type { NextFunction, Request, Response } from 'express';
import { getPool } from '../db';
import { hashApiKey } from '../utils/apiKey';

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawKey = req.header('x-api-key');
  if (!rawKey) {
    res.status(401).json({ error: 'missing_api_key' });
    return;
  }

  try {
    const pool = getPool();
    const digest = hashApiKey(rawKey);
    const result = await pool.query('SELECT id, name FROM merchants WHERE api_key_hash = $1', [
      digest,
    ]);

    if (result.rowCount === 0) {
      res.status(401).json({ error: 'invalid_api_key' });
      return;
    }

    req.merchant = result.rows[0] as { id: string; name: string };
    next();
  } catch (err) {
    next(err);
  }
}
