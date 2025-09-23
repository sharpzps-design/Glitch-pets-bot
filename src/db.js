// src/db.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Accept Supabase's SSL cert in hosted environments (Render)
  ssl: { rejectUnauthorized: false }
});

export default {
  query: (text, params) => pool.query(text, params)
};
