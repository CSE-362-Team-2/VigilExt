export const STATUSES = ['created', 'authorised', 'captured', 'failed', 'refunded'] as const;

export type PaymentStatus = (typeof STATUSES)[number];

export const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  created: ['authorised', 'failed'],
  authorised: ['captured', 'failed'],
  captured: ['refunded'],
  failed: [],
  refunded: [],
};

export function canTransition(from: string, to: string): boolean {
  if (!(STATUSES as readonly string[]).includes(from)) return false;
  if (!(STATUSES as readonly string[]).includes(to)) return false;
  return (TRANSITIONS[from as PaymentStatus] ?? []).includes(to as PaymentStatus);
}
