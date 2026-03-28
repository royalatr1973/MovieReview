import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from './schema';

const CURRENT_VERSION = 1;

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Create migrations tracking table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_version'
  );
  const currentVersion = result?.version ?? 0;

  if (currentVersion < 1) {
    await initializeDatabase(db);
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', 1);
  }

  // Future migrations go here:
  // if (currentVersion < 2) { ... }
}
