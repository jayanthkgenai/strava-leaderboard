const express = require('express');
const router = express.Router();
const strava = require('./strava');
const { summarizeActivities, SPORT_SCORES } = require('./scoring');
const redis = require('./redis');

// Kumara Parvatha trek qualification goal (all-time points)
const KP_GOAL = 1000;

// Middleware: require login
function requireAuth(req, res, next) {
  if (!req.session?.athlete) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// ── Dashboard API ─────────────────────────────────────────────

// GET /api/me - athlete profile
router.get('/api/me', requireAuth, async (req, res) => {
  try {
    const athlete = await strava.getAthlete(req.session);
    res.json(athlete);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats - YTD + all-time stats
router.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const stats = await strava.getAthleteStats(req.session, req.session.athlete.id);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recent - last 20 activities
router.get('/api/recent', requireAuth, async (req, res) => {
  try {
    const activities = await strava.getRecentActivities(req.session);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activities?period=week|month|all&type=Run|Ride|... - filtered activities
router.get('/api/activities', requireAuth, async (req, res) => {
  try {
    const period = req.query.period || 'month';
    let activities;
    if (period === 'week')      activities = await strava.getWeeklyActivities(req.session);
    else if (period === 'all')  activities = await strava.getAllTimeActivities(req.session);
    else                        activities = await strava.getMonthlyActivities(req.session);

    // Optional type filter (matches sport_type or type)
    const type = req.query.type;
    if (type && type !== 'all') {
      activities = activities.filter(a => (a.sport_type === type || a.type === type));
    }

    // Sort newest first
    activities.sort((a, b) => new Date(b.start_date_local) - new Date(a.start_date_local));

    res.json({ period, type: type || 'all', activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scoring - points reference table (for transparency page)
router.get('/api/scoring', requireAuth, (req, res) => {
  const table = Object.entries(SPORT_SCORES).map(([key, cfg]) => ({
    sport: key,
    label: cfg.label,
    points: cfg.pts,
    unit: cfg.unit,
  }));
  res.json({ scoring: table, goal: KP_GOAL });
});

// GET /api/progress - this athlete's progress toward the Kumara Parvatha goal
router.get('/api/progress', requireAuth, async (req, res) => {
  try {
    const entry = await redis.getUserEntry(req.session.athlete.id);
    const allTimePoints = entry?.alltime?.totalPoints || 0;
    const pct = Math.min(100, Math.round((allTimePoints / KP_GOAL) * 1000) / 10);

    res.json({
      goal: KP_GOAL,
      points: allTimePoints,
      pct,
      qualified: allTimePoints >= KP_GOAL,
      remaining: Math.max(0, Math.round((KP_GOAL - allTimePoints) * 10) / 10),
      lastSync: entry?.updatedAt || null,
      byType: entry?.alltime?.byType || {},
      stats: entry?.alltime || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Leaderboard API ───────────────────────────────────────────

/**
 * POST /api/leaderboard/sync
 * Fetches weekly, monthly, and all-time (since Oct 1 2026) activities,
 * scores them, and saves to Redis with TTL until Dec 31 2026.
 */
router.post('/api/leaderboard/sync', requireAuth, async (req, res) => {
  try {
    const [weekly, monthly, allTime] = await Promise.all([
      strava.getWeeklyActivities(req.session),
      strava.getMonthlyActivities(req.session),
      strava.getAllTimeActivities(req.session),
    ]);

    const weeklyStats  = summarizeActivities(weekly);
    const monthlyStats = summarizeActivities(monthly);
    const allTimeStats = summarizeActivities(allTime);

    const entry = {
      athleteId: req.session.athlete.id,
      name: req.session.athlete.name,
      avatar: req.session.athlete.avatar,
      city: req.session.athlete.city,
      updatedAt: Date.now(),
      weekly: weeklyStats,
      monthly: monthlyStats,
      alltime: allTimeStats,
    };

    await redis.saveUserEntry(req.session.athlete.id, entry);
    res.json({ success: true, entry });
  } catch (err) {
    console.error('Sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leaderboard?period=weekly|monthly|alltime&sort=points|distance|elevation|activities
 * Returns all users sorted by chosen metric
 */
router.get('/api/leaderboard', requireAuth, async (req, res) => {
  try {
    const validPeriods = ['weekly', 'monthly', 'alltime'];
    const period = validPeriods.includes(req.query.period) ? req.query.period : 'weekly';
    const sort = req.query.sort || 'points';

    const entries = await redis.getAllEntries();

    const ranked = entries
      .map(e => {
        const stats = e[period] || {};
        return {
          athleteId: e.athleteId,
          name: e.name,
          avatar: e.avatar,
          city: e.city,
          updatedAt: e.updatedAt,
          points: stats.totalPoints || 0,
          distance: Math.round((stats.totalDistance || 0) / 1000 * 10) / 10, // km
          elevation: Math.round(stats.totalElevation || 0),
          activities: stats.activityCount || 0,
          time: Math.round((stats.totalTime || 0) / 3600 * 10) / 10, // hours
          byType: stats.byType || {},
        };
      })
      .sort((a, b) => {
        const fields = { points: 'points', distance: 'distance', elevation: 'elevation', activities: 'activities' };
        const field = fields[sort] || 'points';
        return b[field] - a[field];
      })
      .map((e, i) => ({ ...e, rank: i + 1 }));

    res.json({ period, sort, leaderboard: ranked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/session - check if logged in (for frontend)
router.get('/api/session', (req, res) => {
  if (req.session?.athlete) {
    res.json({ loggedIn: true, athlete: req.session.athlete });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
