import type { PaymentStatus } from './domain/paymentStates';

export interface Merchant {
  id: string;
  name: string;
}

export interface PaymentRow {
  id: string;
  merchant_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotency_key: string;
  created_at: Date;
  updated_at: Date;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      merchant?: Merchant;
      payment?: PaymentRow;
    }
  }
}

export {};
