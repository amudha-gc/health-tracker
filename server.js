// server.js
const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

/* ----------------------- Basic Security Only ----------------------- */

// Hide framework, trust proxy (needed for HTTPS redirect behind Render)
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Security headers (CSP off to avoid blocking the React bundle)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: false, //Disable HSTS for local for now
  })
);

// Gzip static/API
app.use(compression());

// Small JSON body cap
app.use(express.json({ limit: '64kb' }));

//Not setting CORS since for this example I am running frontend and backend from same domain

// HTTPS-only redirect (enable with FORCE_HTTPS=true)
const FORCE_HTTPS = /^(1|true|yes)$/i.test(String(process.env.FORCE_HTTPS || ''));
if (FORCE_HTTPS) {
  app.use((req, res, next) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (!isHttps) {
      const host = req.headers.host;
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    next();
  });
}

// Light API rate-limit (per instance)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  })
);

// Prevent caches on API responses
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

/* ------------------------------ SQLite setup ----------------------------- */

const DB_PATH = process.env.DB_PATH || '/app/data/health_tracker.db';
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('Error opening database:', err);
  else {
    console.log('Connected to SQLite:', DB_PATH);
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
    );
  `,
    (err) => {
      if (err) console.error('Error creating table:', err);
      else console.log('Database table ready');
    }
  );
}

/* ------------------------------ Validation ------------------------------- */

function todayStrLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function validateMetric(req, res, next) {
  const { date, steps, heart_rate } = req.body;

  // Date first: required -> format -> future
  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  if (date > todayStrLocal())
    return res.status(400).json({ error: 'Date cannot be in the future' });

  // Required numeric fields
  if (steps === undefined || steps === '') return res.status(400).json({ error: 'Steps are required' });
  if (heart_rate === undefined || heart_rate === '') return res.status(400).json({ error: 'Heart rate is required' });

  const stepsNum = Number(steps);
  const hrNum = Number(heart_rate);

  if (!Number.isInteger(stepsNum) || stepsNum < 0)
    return res.status(400).json({ error: 'Steps must be a positive integer' });

  if (!Number.isInteger(hrNum) || hrNum < 30 || hrNum > 220)
    return res.status(400).json({ error: 'Heart rate must be between 30 and 220 bpm' });

  next();
}

/* --------------------------------- API ----------------------------------- */

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Health Tracker API is running' });
});

// List metrics (?start=YYYY-MM-DD&end=YYYY-MM-DD)
function listMetrics(req, res) {
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
    if (err) return res.status(500).json({ error: 'Failed to fetch metrics' });
    res.json(rows);
  });
}
app.get('/api/metrics', listMetrics);

// Create metric
function createMetric(req, res) {
  const { date, steps, heart_rate } = req.body;
  const sql = `INSERT INTO metrics (date, steps, heart_rate) VALUES (?, ?, ?)`;
  db.run(sql, [date, Number(steps), Number(heart_rate)], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to save metric' });
    res.status(201).json({
      id: this.lastID,
      date,
      steps: Number(steps),
      heart_rate: Number(heart_rate),
      message: 'Metric saved successfully',
    });
  });
}
app.post('/api/metrics', validateMetric, createMetric);

// Read one
app.get('/api/metrics/:id', (req, res) => {
  db.get('SELECT * FROM metrics WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch metric' });
    if (!row) return res.status(404).json({ error: 'Metric not found' });
    res.json(row);
  });
});

// Delete
app.delete('/api/metrics/:id', (req, res) => {
  db.run('DELETE FROM metrics WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete metric' });
    if (this.changes === 0) return res.status(404).json({ error: 'Metric not found' });
    res.json({ message: 'Metric deleted successfully' });
  });
});

// Aggregate stats
function getStats(_req, res) {
  const sql = `
    SELECT 
      COUNT(*) AS total_entries,
      AVG(steps) AS avg_steps,
      AVG(heart_rate) AS avg_heart_rate,
      MAX(steps) AS max_steps,
      MIN(steps) AS min_steps,
      MAX(heart_rate) AS max_heart_rate,
      MIN(heart_rate) AS min_heart_rate
    FROM metrics
  `;
  db.get(sql, [], (err, row = {}) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch statistics' });
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
}
app.get('/api/stats', getStats);

// Friendly aliases (same handlers)
app.get('/api/entries', listMetrics);
app.post('/api/entries', validateMetric, createMetric);
app.get('/api/entry-stats', getStats);

/* ----------------------- Static frontend + SPA fallback ------------------- */

// Dockerfile copies the React build into /app/public
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Let the SPA handle all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* --------------------------- Errors & 404s (API) -------------------------- */

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

/* --------------------------------- Start --------------------------------- */

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`API at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('Database connection closed');
    process.exit(0);
  });
});
