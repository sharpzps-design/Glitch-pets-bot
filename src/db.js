// src/db.js
import pkg from "pg";
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // <- accept Supabase's cert
});

export default {
  query: (text, params) => pool.query(text, params),
  pool,
};
