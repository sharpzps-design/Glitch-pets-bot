import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function query(q, params) {
  const res = await pool.query(q, params);
  return res;
}
