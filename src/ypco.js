/**
 * ypco.js — YPCO (You Please Carry On) shame wall backend
 * Stores YPCO declarations and emoji reactions in Redis
 */
const express = require('express');
const router = express.Router();
const redis = require('./redis');

// TTL: 7 days for individual YPCOs (shame expires, but the count lives on)
const YPCO_TTL = 7 * 24 * 60 * 60;
// All-time YPCO count key per user — lives till Dec 31 2026
const COUNT_TTL = () => redis.getTTLSeconds();

function requireAuth(req, res, next) {
  if (!req.session?.athlete) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

/**
 * POST /api/ypco
 * Declare yourself a YPCO for today
 */
router.post('/api/ypco', requireAuth, async (req, res) => {
  try {
    const { reason, event, excuseId } = req.body;
    const athlete = req.session.athlete;
    const today = new Date().toISOString().split('T')[0];
    const key = `ypco:${today}:${athlete.id}`;

    // Check if already YPCO'd today
    const existing = await redis.redisCommand('GET', key);
    if (existing) {
      return res.json({ success: false, message: 'You already YPCO\'d today. Shame enough for one day 😂' });
    }

    const entry = {
      athleteId: athlete.id,
      name: athlete.name,
      avatar: athlete.avatar,
      reason: reason || 'No excuse given 🤷',
      excuseId: excuseId || 'other',
      event: event || 'Unknown workout',
      timestamp: Date.now(),
      date: today,
      reactions: {},
      roasts: [],
    };

    await redis.redisCommand('SET', key, JSON.stringify(entry), 'EX', YPCO_TTL);

    // Increment all-time YPCO count for this user
    const countKey = `ypco:count:${athlete.id}`;
    await redis.redisCommand('INCR', countKey);
    await redis.redisCommand('EXPIRE', countKey, COUNT_TTL());

    // Add to today's YPCO list index
    const listKey = `ypco:list:${today}`;
    await redis.redisCommand('SADD', listKey, `${today}:${athlete.id}`);
    await redis.redisCommand('EXPIRE', listKey, YPCO_TTL);

    res.json({ success: true, entry });
  } catch (err) {
    console.error('YPCO error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ypco?days=7
 * Get recent YPCOs (last N days, default 7)
 */
router.get('/api/ypco', requireAuth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 7);
    const allEntries = [];

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const listKey = `ypco:list:${dateStr}`;

      const keys = await redis.redisCommand('SMEMBERS', listKey);
      if (!keys || keys.length === 0) continue;

      const fullKeys = keys.map(k => `ypco:${k}`);
      const values = await redis.redisCommand('MGET', ...fullKeys);
      values.filter(Boolean).forEach(v => {
        const entry = JSON.parse(v);
        // Attach all-time count (fetched separately below)
        allEntries.push(entry);
      });
    }

    // Attach all-time YPCO counts
    for (const entry of allEntries) {
      const countKey = `ypco:count:${entry.athleteId}`;
      const count = await redis.redisCommand('GET', countKey);
      entry.totalYPCOs = parseInt(count) || 1;
    }

    // Sort by most recent first
    allEntries.sort((a, b) => b.timestamp - a.timestamp);

    res.json({ ypcos: allEntries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ypco/:date/:athleteId/react
 * React to someone's YPCO with an emoji
 */
router.post('/api/ypco/:date/:athleteId/react', requireAuth, async (req, res) => {
  try {
    const { date, athleteId } = req.params;
    const { emoji } = req.body;
    const validEmojis = ['😂', '🤣', '😤', '🫣', '💀', '🙈', '👎', '🏳️'];
    if (!validEmojis.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji' });

    const key = `ypco:${date}:${athleteId}`;
    const val = await redis.redisCommand('GET', key);
    if (!val) return res.status(404).json({ error: 'YPCO not found' });

    const entry = JSON.parse(val);
    entry.reactions[emoji] = (entry.reactions[emoji] || 0) + 1;

    const ttl = await redis.redisCommand('TTL', key);
    await redis.redisCommand('SET', key, JSON.stringify(entry), 'EX', Math.max(ttl, 60));

    res.json({ success: true, reactions: entry.reactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ypco/:date/:athleteId/roast
 * Leave a roast message on someone's YPCO
 */
router.post('/api/ypco/:date/:athleteId/roast', requireAuth, async (req, res) => {
  try {
    const { date, athleteId } = req.params;
    const { message } = req.body;
    if (!message || message.trim().length === 0) return res.status(400).json({ error: 'Empty message' });
    if (message.length > 200) return res.status(400).json({ error: 'Too long (max 200 chars)' });

    const key = `ypco:${date}:${athleteId}`;
    const val = await redis.redisCommand('GET', key);
    if (!val) return res.status(404).json({ error: 'YPCO not found' });

    const entry = JSON.parse(val);
    entry.roasts.push({
      from: req.session.athlete.name,
      message: message.trim(),
      timestamp: Date.now(),
    });

    const ttl = await redis.redisCommand('TTL', key);
    await redis.redisCommand('SET', key, JSON.stringify(entry), 'EX', Math.max(ttl, 60));

    res.json({ success: true, roasts: entry.roasts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
