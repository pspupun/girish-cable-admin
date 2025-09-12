// server/girish_cable_db.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

const DB_PATH = './database/gc.db';  // ✅ Ensure this path is correct relative to where you run the server
export let db;

export async function initDB() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE,
      password TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      village TEXT NOT NULL,
      phone TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      month INTEGER,
      year INTEGER,
      amount INTEGER,
      status TEXT DEFAULT 'unpaid',
      mode TEXT DEFAULT 'cash',
      note TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );
  `);

  // Insert default admin if not exists
  const adminPhone = '9238205678';
  const adminPassword = 'Girish@5505';
  const hashed = await bcrypt.hash(adminPassword, 10);

  try {
    await db.run('INSERT INTO users (phone, password) VALUES (?, ?)', [adminPhone, hashed]);
    console.log('Default admin created');
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      console.log('Admin already exists');
    } else {
      console.error('Error inserting admin:', err);
    }
  }

  console.log('Database initialized');
}
