import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { environment } from './environment';
import * as schema from '../database/schema';

// Create PostgreSQL connection pool
export const pool = new Pool({
  host: environment.database.host,
  port: environment.database.port,
  user: environment.database.user,
  password: environment.database.password,
  database: environment.database.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
}
