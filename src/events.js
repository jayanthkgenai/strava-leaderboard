/**
 * events.js — Group events board
 * Anyone can post an upcoming race/event with a registration link
 */
const express = require('express');
const router = express.Router();
const redis = require('./redis');

const EVENTS_TTL = redis.getTTLSeconds; // expires Dec 31 2026

function requireAuth(req, res, next) {
  if (!req.session?.athlete) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

/**
 * POST /api/events
 * Add a new event
 */
router.post('/api/events', requireAuth, async (req, res) => {
  try {
    const { title, date, location, url, description, discipline } = req.body;

    if (!title || !date) return res.status(400).json({ error: 'Title and date are required' });

    const id = `${Date.now()}-${req.session.athlete.id}`;
    const event = {
      id,
      title: title.trim().slice(0, 100),
      date,                                          // YYYY-MM-DD
      location: (location || '').trim().slice(0, 100),
      url: (url || '').trim().slice(0, 300),
      description: (description || '').trim().slice(0, 300),
      discipline: discipline || 'Run',               // Run, Ride, Swim, Multi, Other
      addedBy: req.session.athlete.name,
      addedById: req.session.athlete.id,
      addedAt: Date.now(),
      interested: [],                                // list of athlete names going
    };

    const key = `event:${id}`;
    await redis.redisCommand('SET', key, JSON.stringify(event), 'EX', EVENTS_TTL());

    // Add to events index
    await redis.redisCommand('SADD', 'events:index', id);
    await redis.redisCommand('EXPIRE', 'events:index', EVENTS_TTL());

    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/events
 * Get all upcoming events sorted by date
 */
router.get('/api/events', requireAuth, async (req, res) => {
  try {
    const ids = await redis.redisCommand('SMEMBERS', 'events:index');
    if (!ids || ids.length === 0) return res.json({ events: [] });

    const keys = ids.map(id => `event:${id}`);
    const values = await redis.redisCommand('MGET', ...keys);

    const today = new Date().toISOString().split('T')[0];

    const events = values
      .filter(Boolean)
      .map(v => JSON.parse(v))
      .filter(e => e.date >= today)           // only future events
      .sort((a, b) => a.date.localeCompare(b.date)); // nearest first

    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/events/:id/interested
 * Toggle "I'm interested / going" on an event
 */
router.post('/api/events/:id/interested', requireAuth, async (req, res) => {
  try {
    const key = `event:${req.params.id}`;
    const val = await redis.redisCommand('GET', key);
    if (!val) return res.status(404).json({ error: 'Event not found' });

    const event = JSON.parse(val);
    const name = req.session.athlete.name;
    const idx = event.interested.indexOf(name);

    if (idx === -1) {
      event.interested.push(name);
    } else {
      event.interested.splice(idx, 1);
    }

    const ttl = await redis.redisCommand('TTL', key);
    await redis.redisCommand('SET', key, JSON.stringify(event), 'EX', Math.max(ttl, 60));

    res.json({ success: true, interested: event.interested });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/events/:id
 * Delete an event (only the person who added it)
 */
router.delete('/api/events/:id', requireAuth, async (req, res) => {
  try {
    const key = `event:${req.params.id}`;
    const val = await redis.redisCommand('GET', key);
    if (!val) return res.status(404).json({ error: 'Event not found' });

    const event = JSON.parse(val);
    if (String(event.addedById) !== String(req.session.athlete.id)) {
      return res.status(403).json({ error: 'Only the person who added this event can delete it' });
    }

    await redis.redisCommand('DEL', key);
    await redis.redisCommand('SREM', 'events:index', req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
