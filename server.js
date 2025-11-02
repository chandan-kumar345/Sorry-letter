const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // serve index.html / admin.html if present

// open (or create) sqlite DB
const dbFile = path.join(__dirname, 'selections.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open DB:', err);
    process.exit(1);
  }
});

// create table if not exists
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    choice TEXT NOT NULL,
    page TEXT,
    created_at TEXT NOT NULL,
    user_agent TEXT
  )`);
});

// POST endpoint to save a selection
app.post('/api/selection', (req, res) => {
  const { choice, page, timestamp } = req.body || {};
  if (!choice) return res.status(400).json({ error: 'choice required' });

  const createdAt = timestamp || new Date().toISOString();
  const ua = req.get('User-Agent') || null;

  db.run(
    `INSERT INTO selections (choice, page, created_at, user_agent) VALUES (?, ?, ?, ?)`,
    [choice, page || null, createdAt, ua],
    function (err) {
      if (err) {
        console.error('DB insert error:', err);
        return res.status(500).json({ error: 'db error' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// GET endpoint to list selections (for admin)
app.get('/api/selections', (req, res) => {
  db.all(`SELECT * FROM selections ORDER BY created_at DESC`, (err, rows) => {
    if (err) {
      console.error('DB read error:', err);
      return res.status(500).json({ error: 'db error' });
    }
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});