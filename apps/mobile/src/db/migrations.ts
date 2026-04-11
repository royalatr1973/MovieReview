import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase, applyMigrationV2, applyMigrationV3 } from './schema';

const CURRENT_VERSION = 3;

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

  if (currentVersion < 2) {
    await applyMigrationV2(db);
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', 2);
  }

  if (currentVersion < 3) {
    await applyMigrationV3(db);
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', 3);
  }
}
