import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files like login.html, dashboard.html, etc.

// --- Database ---
let db;
(async () => {
  db = await open({ filename: './girishcable.db', driver: sqlite3.Database });

  // Create tables if not exist
  await db.run(`CREATE TABLE IF NOT EXISTS users (
    phone TEXT PRIMARY KEY,
    password TEXT
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    village TEXT,
    phone TEXT
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT,
    price REAL,
    description TEXT
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,
    month INTEGER,
    year INTEGER,
    amount REAL,
    status TEXT,
    mode TEXT,
    note TEXT,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  )`);

  // Create default admin if not exists
  const admin = await db.get("SELECT * FROM users WHERE phone='9238205678'");
  if (!admin) {
    const hashed = await bcrypt.hash('Girish@5505', 10);
    await db.run("INSERT INTO users(phone, password) VALUES(?, ?)", '9238205678', hashed);
    console.log("Default admin created");
  }
})();

// ---------------- API Routes ------------------

// Login API
app.post('/api/login', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).send('Phone and password required');
  }

  try {
    const user = await db.get("SELECT * FROM users WHERE phone = ?", phone);
    if (!user) {
      return res.status(401).send('Invalid phone or password');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).send('Invalid phone or password');
    }

    res.json({ phone: user.phone });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Change Password API
app.post('/api/change-password', async (req, res) => {
  const { phone, newPassword } = req.body;
  const hashed = await bcrypt.hash(newPassword, 10);
  await db.run("UPDATE users SET password=? WHERE phone=?", hashed, phone);
  res.send({ success: true });
});

// Customers APIs
app.get('/api/customers', async (req, res) => {
  const data = await db.all("SELECT * FROM customers");
  res.json(data);
});
app.post('/api/customers', async (req, res) => {
  const { id, name, village, phone } = req.body;
  if (!id || !name || !village || !phone) return res.status(400).send('All fields required');
  try {
    await db.run("INSERT INTO customers(id, name, village, phone) VALUES (?, ?, ?, ?)", id, name, village, phone);
    res.send({ success: true });
  } catch (e) {
    res.status(400).send('ID already exists');
  }
});
app.put('/api/customers/:id', async (req, res) => {
  const { name, village, phone } = req.body;
  await db.run("UPDATE customers SET name=?, village=?, phone=? WHERE id=?", name, village, phone, req.params.id);
  res.send({ success: true });
});
app.delete('/api/customers/:id', async (req, res) => {
  await db.run("DELETE FROM customers WHERE id=?", req.params.id);
  await db.run("DELETE FROM payments WHERE customer_id=?", req.params.id);
  res.send({ success: true });
});

// Plans APIs
app.get('/api/plans', async (req, res) => {
  const data = await db.all("SELECT * FROM plans");
  res.json(data);
});
app.post('/api/plans', async (req, res) => {
  const { id, name, price, description } = req.body;
  if (!id || !name || !price) return res.status(400).send('All fields required');
  try {
    await db.run("INSERT INTO plans(id, name, price, description) VALUES (?, ?, ?, ?)", id, name, price, description);
    res.send({ success: true });
  } catch (e) {
    res.status(400).send('ID already exists');
  }
});
app.put('/api/plans/:id', async (req, res) => {
  const { name, price, description } = req.body;
  await db.run("UPDATE plans SET name=?, price=?, description=? WHERE id=?", name, price, description, req.params.id);
  res.send({ success: true });
});
app.delete('/api/plans/:id', async (req, res) => {
  await db.run("DELETE FROM plans WHERE id=?", req.params.id);
  res.send({ success: true });
});

// Payments APIs
app.get('/api/customers/:id/payments', async (req, res) => {
  const data = await db.all("SELECT * FROM payments WHERE customer_id=? ORDER BY year, month", req.params.id);
  res.json(data);
});
app.post('/api/payments', async (req, res) => {
  const { customer_id, month, year, amount, status, mode, note } = req.body;
  await db.run("INSERT INTO payments(customer_id, month, year, amount, status, mode, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
    customer_id, month, year, amount, status, mode, note);
  res.send({ success: true });
});
app.put('/api/payments/:id', async (req, res) => {
  const { amount, status, mode, note } = req.body;
  await db.run("UPDATE payments SET amount=?, status=?, mode=?, note=? WHERE id=?", amount, status, mode, note, req.params.id);
  res.send({ success: true });
});

// Summary API
app.get('/api/summary', async (req, res) => {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const monthTotal = await db.get("SELECT SUM(amount) as total FROM payments WHERE month=? AND status='paid'", month);
  const yearTotal = await db.get("SELECT SUM(amount) as total FROM payments WHERE year=? AND status='paid'", year);
  const pending = await db.get("SELECT SUM(amount) as total FROM payments WHERE status='unpaid'");

  res.json({
    monthTotal: monthTotal.total || 0,
    yearTotal: yearTotal.total || 0,
    pending: pending.total || 0
  });
});

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
