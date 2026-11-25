import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDatabasePath(): string {
  const configured = process.env.SQLITE_DB_PATH;
  if (configured && configured.trim().length > 0) {
    return path.resolve(process.cwd(), configured.trim());
  }
  return path.resolve(process.cwd(), 'data', 'fleetcare.db');
}

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  return dbInstance;
}
