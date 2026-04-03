import { Platform } from 'react-native';
import { runMigrations } from './migrations';

let _db: any = null;
let _initPromise: Promise<any> | null = null;

/**
 * Returns the singleton SQLiteDatabase instance.
 * Opens the DB and runs migrations on first call.
 * Returns null on web (SQLite not supported).
 */
export async function getDatabase(): Promise<any | null> {
  if (Platform.OS === 'web') return null;

  // If already initialized, return immediately
  if (_db) return _db;

  // If initialization is in progress, wait for it
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const SQLite = require('expo-sqlite');
      const db = await SQLite.openDatabaseAsync('cinereview.db');
      await runMigrations(db);
      _db = db;
      return db;
    } catch (err) {
      console.error('[DB] Failed to initialize database:', err);
      _initPromise = null;
      return null;
    }
  })();

  return _initPromise;
}

/**
 * Resets the singleton (for testing only).
 */
export function resetDatabase() {
  _db = null;
  _initPromise = null;
}
