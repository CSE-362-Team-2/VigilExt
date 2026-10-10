const STATUSES = ['created', 'authorised', 'captured', 'failed', 'refunded'];

const TRANSITIONS = {
  created: ['authorised', 'failed'],
  authorised: ['captured', 'failed'],
  captured: ['refunded'],
  failed: [],
  refunded: [],
};

function canTransition(from, to) {
  if (!STATUSES.includes(from) || !STATUSES.includes(to)) return false;
  return (TRANSITIONS[from] || []).includes(to);
}

module.exports = { STATUSES, TRANSITIONS, canTransition };
