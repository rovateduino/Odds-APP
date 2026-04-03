import Database from 'better-sqlite3';
import { join } from 'node:path';

const dbPath = join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

interface CacheRow {
  value: string;
  expires_at: number;
}

// Initialize cache table
db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT,
    expires_at INTEGER
  )
`);

export class CacheManager {
  static get<T>(key: string): T | null {
    const row = db.prepare('SELECT value, expires_at FROM cache WHERE key = ?').get(key) as CacheRow | undefined;
    if (!row) return null;

    if (Date.now() > row.expires_at) {
      db.prepare('DELETE FROM cache WHERE key = ?').run(key);
      return null;
    }

    return JSON.parse(row.value) as T;
  }

  static set(key: string, value: unknown, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    db.prepare('INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)')
      .run(key, JSON.stringify(value), expiresAt);
  }

  static clear(): void {
    db.prepare('DELETE FROM cache').run();
  }
}
