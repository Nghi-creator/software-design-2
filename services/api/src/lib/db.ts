import { Pool, PoolClient, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;

export const db = connectionString
  ? new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
    })
  : undefined;

const getDb = () => {
  if (!db) {
    throw new Error('DATABASE_URL is required');
  }

  return db;
};

export const query = <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => {
  return getDb().query<T>(text, params);
};

export const withTransaction = async <T>(callback: (client: PoolClient) => Promise<T>) => {
  const client = await getDb().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
