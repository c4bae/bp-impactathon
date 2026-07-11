import pg from 'pg';
import 'dotenv/config';

// pg returns numeric/int8 as strings by default; coerce the ones we use as numbers.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));  // int8

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://kwhab:kwhab@localhost:5433/kwhab',
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function one<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
