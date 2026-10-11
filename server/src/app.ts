import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { createPaymentsRouter } from './routes/payments';
import './types';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'vigilnext' });
  });

  // Authenticated namespace. All merchant routes live under /v1.
  app.get('/v1/me', apiKeyAuth, (req: Request, res: Response) => {
    res.status(200).json({ merchant: req.merchant });
  });

  app.use('/v1/payments', apiKeyAuth, createPaymentsRouter());

  // 404 handler returns JSON so invalid input never leaks as HTML or 500.
  app.use((req: Request, res: Response) => {
    void req;
    res.status(404).json({ error: 'not_found' });
  });

  // Error handler keeps bad input as 4xx upstream and unexpected faults as 500 JSON.
  // Malformed JSON bodies surface here as a 400 SyntaxError from express.json().
  const errorHandler: ErrorRequestHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
      res.status(400).json({ error: 'invalid_json' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  };
  app.use(errorHandler);

  return app;
}
