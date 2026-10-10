const express = require('express');
const { apiKeyAuth } = require('./middleware/apiKeyAuth');
const { createPaymentsRouter } = require('./routes/payments');

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'vigilnext' });
  });

  // Authenticated namespace. All merchant routes live under /v1.
  app.get('/v1/me', apiKeyAuth, (req, res) => {
    res.status(200).json({ merchant: req.merchant });
  });

  app.use('/v1/payments', apiKeyAuth, createPaymentsRouter());

  // 404 handler returns JSON so invalid input never leaks as HTML or 500.
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // Error handler keeps bad input as 4xx upstream and unexpected faults as 500 JSON.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}

module.exports = { createApp };
