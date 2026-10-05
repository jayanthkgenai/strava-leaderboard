require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const oauthRouter = require('./oauth');
const apiRouter = require('./routes');
const ypcoRouter = require('./ypco');
const roastRouter = require('./roast');
const eventsRouter = require('./events');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Railway/Render proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'strava-lb-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// ── Routes ────────────────────────────────────────────────────
app.use('/auth', oauthRouter);
app.use('/', apiRouter);
app.use('/', ypcoRouter);
app.use('/', roastRouter);
app.use('/', eventsRouter);

// SPA fallback — serve index.html for all non-API routes
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/ypco', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/events', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🏃 Strava Leaderboard running on http://localhost:${PORT}`);
});

module.exports = app;
