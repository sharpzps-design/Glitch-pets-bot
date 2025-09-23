// src/db.js
import pkg from "pg";
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString,
  ssl: {
    require: true,            // ✅ force SSL
    rejectUnauthorized: false // ✅ accept Supabase's cert
  },
});

export default {
  query: (text, params) => pool.query(text, params),
  pool,
};
