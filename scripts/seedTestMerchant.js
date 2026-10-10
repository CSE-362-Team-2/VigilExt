require('dotenv').config();
const { Client } = require('pg');
const { hashApiKey } = require('../src/utils/apiKey');

async function main() {
  const rawKey = process.env.TEST_API_KEY || 'vigilnext_test_key_123';
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const digest = hashApiKey(rawKey);
    await client.query(
      `INSERT INTO merchants (name, api_key_hash)
       VALUES ('test merchant', $1)
       ON CONFLICT (api_key_hash) DO NOTHING`,
      [digest]
    );
    console.log('test merchant seeded');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
