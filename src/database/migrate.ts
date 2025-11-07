import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '../config/database';
import { pool } from '../config/database';

async function runMigrations() {
  console.log('Running migrations...');
  
  try {
    await migrate(db, { migrationsFolder: './src/database/migrations' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
