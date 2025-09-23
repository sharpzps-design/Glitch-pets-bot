// src/db.js
import pkg from "pg";
import dns from "dns";
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

// Force DNS resolution to IPv4
dns.setDefaultResultOrder("ipv4first");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export default {
  query: (text, params) => pool.query(text, params),
  pool,
};
