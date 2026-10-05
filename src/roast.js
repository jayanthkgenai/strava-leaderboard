/**
 * roast.js — Template-based workout roast engine
 * Analyzes Strava activity data and generates savage-but-fun roasts
 */
const express = require('express');
const router = express.Router();
const strava = require('./strava');

function requireAuth(req, res, next) {
  if (!req.session?.athlete) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// ── Roast Template Banks ──────────────────────────────────────

const SLOW_PACE_ROASTS = [
  "Your pace is so slow, Google Maps rerouted you as a 'scenic walk' 🗺️",
  "You ran {pace}/km. My grandma texts faster than you run 👵",
  "At {pace}/km, you're not running — you're just falling forward very slowly 🐢",
  "The crows on the road overtook you. The CROWS. 🐦",
  "Your Garmin auto-paused because it thought you stopped. You hadn't. ⌚",
  "With a pace of {pace}/km, your shoes have more rest days than you do 👟",
];

const FAST_PACE_ROASTS = [
  "Look at you, {pace}/km! Did someone steal your breakfast? 🏃💨",
  "Okay speed demon, slow down before you leave your soul behind at {pace}/km 👻",
  "{pace}/km? Either you're fast or your GPS is broken. Probably GPS. 📡",
  "Running at {pace}/km on a weekday? Some of us have jobs, Jayanth 😤",
];

const SHORT_DISTANCE_ROASTS = [
  "You ran {dist}km and called it a workout. My dog walks more than that. 🐕",
  "{dist}km? That's barely enough to warm up your excuses 🙃",
  "Legend has it {dist}km is the exact distance from your bed to your fridge 🛏️🍕",
  "Your shoes are confused — they thought they signed up for a run, not a stroll to the gate 🚪",
  "{dist}km run logged. Your Strava followers are trying to find the 'dislike' button 😬",
];

const LONG_DISTANCE_ROASTS = [
  "{dist}km?! Your legs called, they want a lawyer 🦵⚖️",
  "After {dist}km you probably call the toilet 'the recovery zone' 🚽",
  "{dist}km on a weekday? Your family has filed a missing persons report 👨‍👩‍👧",
  "Respect for {dist}km, but your knees have submitted a formal complaint 📄",
];

const LOW_FREQUENCY_ROASTS = [
  "You worked out {count} times this week. Even your fitness app is concerned 📱",
  "{count} activity this week? The dust on your shoes has developed a personality 🧹",
  "Your running shoes are collecting rent from the cobwebs at this point 🕸️",
  "{count} workout logged. Netflix is very proud of you though 📺",
  "Your Strava profile looks like a crime scene — no activity, no witnesses 🔍",
];

const HIGH_FREQUENCY_ROASTS = [
  "{count} workouts this week! Please introduce your family to us, we've forgotten their faces 👨‍👩‍👧",
  "{count} activities? Your rest day is just a myth at this point 😤",
  "You logged {count} sessions this week. Rest is also training. Heard of it? 🛌",
  "{count} workouts! Your body has filed for bankruptcy. Congratulations 🏆",
];

const ELEVATION_ROASTS = [
  "You climbed {elev}m. That's slightly more than your building's parking ramp 🅿️",
  "{elev}m elevation? My sofa has more hills than your route 🛋️",
  "The Everest climbers saw your {elev}m elevation gain and felt nothing 🏔️",
];

const ZERO_ACTIVITY_ROASTS = [
  "No activities this week?! Even your shadow is disappointed 😔",
  "Your Strava is so empty it echoed when I opened it 🔊",
  "Zero workouts logged. Your fitness goals called — they've found someone else 📞",
  "The only thing you're training this week is your ability to avoid training 🎯",
  "Your running shoes sent a welfare check 👟📲",
  "This week's performance review: Excellent work at doing absolutely nothing 📋",
];

const HM_ROASTS = [
  "Your half marathon time of {time} means you were out there long enough to watch a full movie 🎬",
  "{time} for a half marathon. The medal is the same whether you run it or sleepwalk it, don't worry 🥇",
  "At {time}, you finished your half marathon just before they started packing up the finish line 😅",
  "Your HM time of {time} — that's not running, that's a guided tour of the course 🗺️",
];

const MOTIVATIONAL_CLOSER = [
  "But seriously — you showed up. That's more than most people 💪",
  "All jokes aside, every km counts. Keep going! 🔥",
  "Roasting aside — you're out there doing it while others are on the couch. Respect. 🙏",
  "In all seriousness, you're lapping everyone on the couch 🛋️➡️🏃",
  "Now go sign up for that race you've been avoiding 😤",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(template, data) {
  return template
    .replace('{pace}', data.pace || '?')
    .replace('{dist}', data.dist || '?')
    .replace('{count}', data.count || '?')
    .replace('{elev}', data.elev || '?')
    .replace('{time}', data.time || '?');
}

function secToMinSec(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtHMTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Generate roasts from activity data
 */
function generateRoasts(activities, athleteName) {
  const roasts = [];
  const firstName = athleteName.split(' ')[0];

  if (!activities || activities.length === 0) {
    return [
      pick(ZERO_ACTIVITY_ROASTS),
      pick(ZERO_ACTIVITY_ROASTS),
      pick(MOTIVATIONAL_CLOSER),
    ];
  }

  const runs = activities.filter(a => a.type === 'Run' || a.sport_type === 'Run');
  const totalActivities = activities.length;

  // ── Frequency roast ──────────────────────────────────────
  if (totalActivities === 0) {
    roasts.push(fillTemplate(pick(ZERO_ACTIVITY_ROASTS), { count: 0 }));
  } else if (totalActivities <= 2) {
    roasts.push(fillTemplate(pick(LOW_FREQUENCY_ROASTS), { count: totalActivities }));
  } else if (totalActivities >= 7) {
    roasts.push(fillTemplate(pick(HIGH_FREQUENCY_ROASTS), { count: totalActivities }));
  }

  // ── Run pace roast ───────────────────────────────────────
  if (runs.length > 0) {
    const avgPaceSec = runs.reduce((sum, r) => {
      if (!r.distance || !r.moving_time) return sum;
      return sum + (r.moving_time / (r.distance / 1000));
    }, 0) / runs.length;

    const paceStr = secToMinSec(avgPaceSec);

    if (avgPaceSec > 420) { // slower than 7:00/km
      roasts.push(fillTemplate(pick(SLOW_PACE_ROASTS), { pace: paceStr }));
    } else if (avgPaceSec < 300) { // faster than 5:00/km
      roasts.push(fillTemplate(pick(FAST_PACE_ROASTS), { pace: paceStr }));
    }

    // ── Distance roast ───────────────────────────────────
    const avgDist = runs.reduce((s, r) => s + (r.distance || 0), 0) / runs.length / 1000;
    if (avgDist < 5) {
      roasts.push(fillTemplate(pick(SHORT_DISTANCE_ROASTS), { dist: avgDist.toFixed(1) }));
    } else if (avgDist > 18) {
      roasts.push(fillTemplate(pick(LONG_DISTANCE_ROASTS), { dist: avgDist.toFixed(1) }));
    }

    // ── HM race roast ────────────────────────────────────
    const hmRun = runs.find(r => r.distance >= 20000 && r.distance <= 22500);
    if (hmRun) {
      roasts.push(fillTemplate(pick(HM_ROASTS), { time: fmtHMTime(hmRun.moving_time) }));
    }
  }

  // ── Elevation roast ──────────────────────────────────────
  const totalElev = activities.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
  if (totalElev < 50 && totalActivities > 2) {
    roasts.push(fillTemplate(pick(ELEVATION_ROASTS), { elev: Math.round(totalElev) }));
  }

  // Always end with a motivational closer
  roasts.push(pick(MOTIVATIONAL_CLOSER));

  // Max 4 roasts, min 2
  return roasts.slice(0, 4);
}

// ── API endpoint ──────────────────────────────────────────────

/**
 * GET /api/roast?period=week|month
 * Fetches recent activities and returns roasts
 */
router.get('/api/roast', requireAuth, async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'monthly' : 'weekly';
    const activities = period === 'monthly'
      ? await strava.getMonthlyActivities(req.session)
      : await strava.getWeeklyActivities(req.session);

    const roasts = generateRoasts(activities, req.session.athlete.name);

    // Build summary stats for context
    const runs = activities.filter(a => a.type === 'Run' || a.sport_type === 'Run');
    const totalDist = activities.reduce((s, a) => s + (a.distance || 0), 0) / 1000;
    const avgPaceSec = runs.length > 0
      ? runs.reduce((s, r) => s + (r.moving_time / (r.distance / 1000)), 0) / runs.length
      : null;

    res.json({
      roasts,
      stats: {
        activities: activities.length,
        runs: runs.length,
        totalDistKm: Math.round(totalDist * 10) / 10,
        avgPace: avgPaceSec ? secToMinSec(avgPaceSec) : null,
        period,
      },
    });
  } catch (err) {
    console.error('Roast error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
