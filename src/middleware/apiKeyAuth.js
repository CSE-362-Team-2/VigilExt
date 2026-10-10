const { getPool } = require('../db');
const { hashApiKey } = require('../utils/apiKey');

async function apiKeyAuth(req, res, next) {
  const rawKey = req.header('x-api-key');
  if (!rawKey) {
    return res.status(401).json({ error: 'missing_api_key' });
  }

  try {
    const pool = getPool();
    const digest = hashApiKey(rawKey);
    const result = await pool.query('SELECT id, name FROM merchants WHERE api_key_hash = $1', [digest]);

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'invalid_api_key' });
    }

    req.merchant = result.rows[0];
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { apiKeyAuth };
