const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL environment variable.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Render Postgres typically requires SSL
});

async function initDb() {
  // Create eggs table if not exists (simple schema)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS eggs (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      species TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      hatch_at TIMESTAMP NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING'
    );
    CREATE INDEX IF NOT EXISTS idx_eggs_due ON eggs (status, hatch_at);
  `);
  console.log('DB ready.');
}

module.exports = {
  pool,
  initDb
};
