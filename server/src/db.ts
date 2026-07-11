import pg from 'pg';
import 'dotenv/config';

// pg returns numeric/int8 as strings by default; coerce the ones we use as numbers.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));  // int8

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://localhost:5432/kwhab',
});

// node-pg has no built-in parser for arrays of custom ENUM types, so columns
// like events.category / accommodation_tags / signups.needs_flagged come back
// as the raw Postgres array literal ("{arts,social}"). Our enum values are
// simple identifiers (no commas/quotes), so a tiny parser is safe. We register
// it for each enum's array OID at startup (call initDb() before serving).
const parseEnumArray = (v: string | null): string[] =>
  !v || v === '{}' ? [] : v.slice(1, -1).split(',').filter(Boolean);

export async function initDb(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT typarray FROM pg_type WHERE typname = ANY($1)`,
    [['accommodation_tag', 'event_category']],
  );
  for (const r of rows) {
    pg.types.setTypeParser(parseInt(r.typarray, 10), parseEnumArray as any);
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function one<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
