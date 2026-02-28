import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

export async function initDB(): Promise<Database> {
    if (db) return db;

    // [CRITICAL] Vercel's filesystem is read-only. We MUST use /tmp to avoid 500 Internal Server Error during registration.
    const dataPath = process.env.VERCEL ? '/tmp/data' : path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
    }

    const dbPath = path.join(dataPath, 'database.sqlite');

    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Check if username column exists
    const tableInfo = await db.all(`PRAGMA table_info(users)`);
    const hasUsersTable = tableInfo.length > 0;
    const hasUsername = tableInfo.some((col: any) => col.name === 'username');

    if (hasUsersTable && !hasUsername) {
        console.log('[DB] Migration: Upgrading users table to include username...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            INSERT INTO users_new (id, username, email, password, created_at)
            SELECT id, email, email, password, created_at FROM users;
            
            DROP TABLE users;
            ALTER TABLE users_new RENAME TO users;
        `);
        console.log('[DB] Migration: Added username column to users table successfully.');
    } else if (!hasUsersTable) {
        // Create the users table if it doesn't already exist
        await db.exec(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    console.log('[DB] SQLite database connected and users table verified.');
    return db;
}

export async function getDB(): Promise<Database> {
    if (!db) {
        return await initDB();
    }
    return db;
}
