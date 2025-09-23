// src/db.js
import pkg from 'pg';
const { Pool } = pkg;

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // ✅ Render/Heroku style env var
  ssl: { rejectUnauthorized: false }           // ✅ required for cloud Postgres
});

// Export a simple query function
export default {
  query: (text, params) => pool.query(text, params),
};
