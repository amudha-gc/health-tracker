const path = require('path');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3001;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- Database ----------
const db = new sqlite3.Database('./health_tracker.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.run(
    `
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      steps INTEGER NOT NULL,
      heart_rate INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Database table ready');
      }
    }
  );
}

// ---------- Validation ----------
function todayStrLocal() {
  const now = new Date(); // respects TZ if TZ is set in env
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function validateMetric(req, res, next) {
  const { date, steps, heart_rate } = req.body;

  // 1) DATE FIRST: required -> format -> future
  if (date === undefined || date === null || date === '') {
    return res.status(400).json({ error: 'Date is required' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
  if (!dateRegex.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (date > todayStrLocal()) {
    return res.status(400).json({ error: 'Date cannot be in the future' });
  }

  // 2) THEN other required fields
  if (steps === undefined || steps === null || steps === '') {
    return res.status(400).json({ error: 'Steps are required' });
  }
  if (heart_rate === undefined || heart_rate === null || heart_rate === '') {
    return res.status(400).json({ error: 'Heart rate is required' });
  }

  // 3) Type/range checks
  const stepsNum = Number(steps);
  if (!Number.isInteger(stepsNum) || stepsNum < 0) {
    return res.status(400).json({ error: 'Steps must be a positive integer' });
  }

  const hrNum = Number(heart_rate);
  if (!Number.isInteger(hrNum) || hrNum < 30 || hrNum > 220) {
    return res.status(400).json({ error: 'Heart rate must be between 30 and 220 bpm' });
  }

  next();
}

// ---------- API Routes ----------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Health Tracker API is running' });
});

app.post('/api/metrics', validateMetric, (req, res) => {
  const { date, steps, heart_rate } = req.body;
  const sql = `INSERT INTO metrics (date, steps, heart_rate) VALUES (?, ?, ?)`;

  db.run(sql, [date, Number(steps), Number(heart_rate)], function (err) {
    if (err) {
      console.error('Error inserting metric:', err);
      return res.status(500).json({ error: 'Failed to save metric' });
    }
    res.status(201).json({
      id: this.lastID,
      date,
      steps: Number(steps),
      heart_rate: Number(heart_rate),
      message: 'Metric saved successfully',
    });
  });
});

app.get('/api/metrics', (req, res) => {
  const { start, end } = req.query;

  let sql = 'SELECT id, date, steps, heart_rate FROM metrics';
  const params = [];
  const where = [];

  if (start) {
    where.push('date >= ?');
    params.push(start);
  }
  if (end) {
    where.push('date <= ?');
    params.push(end);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY date ASC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching metrics:', err);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
    res.json(rows);
  });
});

app.get('/api/metrics/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM metrics WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching metric:', err);
      return res.status(500).json({ error: 'Failed to fetch metric' });
    }
    if (!row) return res.status(404).json({ error: 'Metric not found' });
    res.json(row);
  });
});

app.delete('/api/metrics/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM metrics WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting metric:', err);
      return res.status(500).json({ error: 'Failed to delete metric' });
    }
    if (this.changes === 0)
      return res.status(404).json({ error: 'Metric not found' });
    res.json({ message: 'Metric deleted successfully' });
  });
});

app.get('/api/stats', (_req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_entries,
      AVG(steps) as avg_steps,
      AVG(heart_rate) as avg_heart_rate,
      MAX(steps) as max_steps,
      MIN(steps) as min_steps,
      MAX(heart_rate) as max_heart_rate,
      MIN(heart_rate) as min_heart_rate
    FROM metrics
  `;
  db.get(sql, [], (err, row = {}) => {
    if (err) {
      console.error('Error fetching stats:', err);
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
    res.json({
      total_entries: row.total_entries || 0,
      avg_steps: Math.round(row.avg_steps || 0),
      avg_heart_rate: Math.round(row.avg_heart_rate || 0),
      max_steps: row.max_steps || 0,
      min_steps: row.min_steps || 0,
      max_heart_rate: row.max_heart_rate || 0,
      min_heart_rate: row.min_heart_rate || 0,
    });
  });
});

// ---------- Static Frontend + SPA Fallback ----------
const publicDir = path.join(__dirname, 'public'); // Dockerfile copies build -> /app/public
app.use(express.static(publicDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

// alias GET list
app.get('/api/entries', (req, res) => app._router.handle(
  Object.assign(req, { url: '/api/metrics' }), res, () => {}
));

// alias POST create
app.post('/api/entries', (req, res) => app._router.handle(
  Object.assign(req, { url: '/api/metrics' }), res, () => {}
));

// alias GET by id
app.get('/api/entries/:id', (req, res) => app._router.handle(
  Object.assign(req, { url: `/api/metrics/${req.params.id}` }), res, () => {}
));

// alias DELETE
app.delete('/api/entries/:id', (req, res) => app._router.handle(
  Object.assign(req, { url: `/api/metrics/${req.params.id}` }), res, () => {}
));

// alias stats
app.get('/api/entry-stats', (req, res) => app._router.handle(
  Object.assign(req, { url: '/api/stats' }), res, () => {}
));


// ---------- Error / 404 ----------
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

// ---------- Graceful Shutdown ----------
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('Database connection closed');
    process.exit(0);
  });
});
