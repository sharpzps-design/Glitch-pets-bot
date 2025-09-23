// src/db.js
import pkg from "pg";
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // ✅ accept Supabase self-signed cert
  },
});

export default {
  query: (text, params) => pool.query(text, params),
  pool,
};
