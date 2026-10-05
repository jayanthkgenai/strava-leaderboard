/**
 * Upstash Redis client
 * Uses the REST API (no TCP connection needed — works on serverless/Render free tier)
 */
const axios = require('axios');

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// TTL until Dec 31, 2026 (calculated at runtime)
function getTTLSeconds() {
  const expiry = new Date('2026-12-31T23:59:59Z');
  const now = new Date();
  return Math.max(Math.floor((expiry - now) / 1000), 86400); // min 1 day
}

async function redisCommand(...args) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('Upstash Redis env vars not set (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)');
  }
  const res = await axios.post(
    `${UPSTASH_URL}`,
    args,
    { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } }
  );
  return res.data.result;
}

/**
 * Save a user's leaderboard entry, preserving existing allTime stats
 * Key: leaderboard:user:<athleteId>
 */
async function saveUserEntry(athleteId, data) {
  const key = `leaderboard:user:${athleteId}`;
  await redisCommand('SET', key, JSON.stringify(data), 'EX', getTTLSeconds());
}

/**
 * Get a single user entry
 */
async function getUserEntry(athleteId) {
  const key = `leaderboard:user:${athleteId}`;
  const val = await redisCommand('GET', key);
  return val ? JSON.parse(val) : null;
}

/**
 * Get all leaderboard entries
 */
async function getAllEntries() {
  const keys = await redisCommand('KEYS', 'leaderboard:user:*');
  if (!keys || keys.length === 0) return [];

  // Fetch all in one MGET
  const values = await redisCommand('MGET', ...keys);
  return values
    .filter(Boolean)
    .map(v => JSON.parse(v));
}

/**
 * Delete a user entry (on logout)
 */
async function deleteUserEntry(athleteId) {
  const key = `leaderboard:user:${athleteId}`;
  await redisCommand('DEL', key);
}

module.exports = {
  redisCommand,
  saveUserEntry,
  getUserEntry,
  getAllEntries,
  deleteUserEntry,
  getTTLSeconds,
};
