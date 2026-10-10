const crypto = require('crypto');

function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

module.exports = { hashApiKey };
