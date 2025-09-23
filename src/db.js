// src/db.js
import pg from 'pg';
const { Pool } = pg;

// Render sets DATABASE_URL automatically
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL environment variable.');
  process.exit(1);
}

// Render Postgres requires SSL
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Tiny helper to run queries
export const query = (text, params) => pool.query(text, params);
