import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log(`[DB Connected]: PostgreSQL responsive at ${res.rows[0].now}`);
    return true;
  } catch (error) {
    console.error('[DB Error]: Failed to connect to PostgreSQL. Ensure service is running.', error);
    return false;
  }
};

export default pool;
