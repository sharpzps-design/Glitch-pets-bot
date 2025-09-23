// src/db.js
import pg from 'pg';

const { Pool } = pg;

// Render automatically provides DATABASE_URL in environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // needed for Render PostgreSQL
  },
});

export default pool;
