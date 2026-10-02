const axios = require('axios');

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

/**
 * Refresh access token if expired, update session in place
 */
async function ensureFreshToken(session) {
  const { tokens } = session;
  const now = Math.floor(Date.now() / 1000);

  if (tokens.expires_at > now + 60) {
    return tokens.access_token; // still valid
  }

  const response = await axios.post('https://www.strava.com/oauth/token', {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });

  session.tokens = {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
    expires_at: response.data.expires_at,
  };

  return session.tokens.access_token;
}

/**
 * Get athlete profile
 */
async function getAthlete(session) {
  const token = await ensureFreshToken(session);
  const res = await axios.get('https://www.strava.com/api/v3/athlete', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * Get athlete stats (YTD, all-time)
 */
async function getAthleteStats(session, athleteId) {
  const token = await ensureFreshToken(session);
  const res = await axios.get(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * Get activities for a given time range
 * @param {object} session
 * @param {number} after  - Unix timestamp
 * @param {number} before - Unix timestamp
 * @param {number} perPage
 */
async function getActivities(session, after, before, perPage = 100) {
  const token = await ensureFreshToken(session);
  const allActivities = [];
  let page = 1;

  while (true) {
    const res = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${token}` },
      params: { after, before, per_page: perPage, page },
    });

    const activities = res.data;
    if (!activities.length) break;

    allActivities.push(...activities);
    if (activities.length < perPage) break;
    page++;
  }

  return allActivities;
}

/**
 * Get this week's activities (Mon 00:00 to now)
 */
async function getWeeklyActivities(session) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysToMon = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMon);
  monday.setHours(0, 0, 0, 0);

  return getActivities(session, Math.floor(monday.getTime() / 1000), Math.floor(now.getTime() / 1000));
}

/**
 * Get this month's activities
 */
async function getMonthlyActivities(session) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return getActivities(session, Math.floor(firstOfMonth.getTime() / 1000), Math.floor(now.getTime() / 1000));
}

/**
 * Get recent activities (last 20)
 */
async function getRecentActivities(session) {
  const token = await ensureFreshToken(session);
  const res = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
    headers: { Authorization: `Bearer ${token}` },
    params: { per_page: 20, page: 1 },
  });
  return res.data;
}

module.exports = {
  ensureFreshToken,
  getAthlete,
  getAthleteStats,
  getActivities,
  getWeeklyActivities,
  getMonthlyActivities,
  getRecentActivities,
};
