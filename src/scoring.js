/**
 * Multi-discipline scoring engine
 * Converts Strava activity types into normalized points
 * so runners, cyclists, swimmers and gym-goers compete fairly.
 */

// Points per km (or per unit for non-distance activities)
const SPORT_SCORES = {
  // Running variants
  Run: { pts: 3, unit: 'km', label: '🏃 Run' },
  TrailRun: { pts: 4, unit: 'km', label: '🏔️ Trail Run' },
  VirtualRun: { pts: 3, unit: 'km', label: '🖥️ Virtual Run' },
  Treadmill: { pts: 3, unit: 'km', label: '🏃 Treadmill' },

  // Cycling variants
  Ride: { pts: 1, unit: 'km', label: '🚴 Ride' },
  MountainBikeRide: { pts: 1.5, unit: 'km', label: '🚵 MTB' },
  GravelRide: { pts: 1.2, unit: 'km', label: '🚵 Gravel' },
  VirtualRide: { pts: 1, unit: 'km', label: '🖥️ Virtual Ride' },
  EBikeRide: { pts: 0.5, unit: 'km', label: '⚡ E-Bike' },

  // Swimming
  Swim: { pts: 10, unit: 'km', label: '🏊 Swim' }, // 10pts/km = 1pt/100m

  // Gym / Strength
  WeightTraining: { pts: 15, unit: 'session', label: '🏋️ Weights' },
  Workout: { pts: 12, unit: 'session', label: '💪 Workout' },
  Crossfit: { pts: 15, unit: 'session', label: '🔥 CrossFit' },
  RockClimbing: { pts: 12, unit: 'session', label: '🧗 Climbing' },
  Yoga: { pts: 8, unit: 'session', label: '🧘 Yoga' },
  Pilates: { pts: 8, unit: 'session', label: '🧘 Pilates' },
  Elliptical: { pts: 10, unit: 'session', label: '🏃 Elliptical' },
  StairStepper: { pts: 10, unit: 'session', label: '🪜 StairStepper' },

  // Outdoor / Multi-sport
  Hike: { pts: 2, unit: 'km', label: '🥾 Hike' },
  Walk: { pts: 1.5, unit: 'km', label: '🚶 Walk' },
  NordicSki: { pts: 2.5, unit: 'km', label: '⛷️ Nordic Ski' },
  AlpineSki: { pts: 2, unit: 'km', label: '🎿 Alpine Ski' },
  Rowing: { pts: 2, unit: 'km', label: '🚣 Rowing' },
  Kayaking: { pts: 1.5, unit: 'km', label: '🛶 Kayaking' },
  Soccer: { pts: 12, unit: 'session', label: '⚽ Soccer' },
  Tennis: { pts: 10, unit: 'session', label: '🎾 Tennis' },
  Badminton: { pts: 10, unit: 'session', label: '🏸 Badminton' },
  IceSkate: { pts: 2, unit: 'km', label: '⛸️ Ice Skate' },
  Surfing: { pts: 12, unit: 'session', label: '🏄 Surf' },
};

const DEFAULT_SCORE = { pts: 8, unit: 'session', label: '🏅 Activity' };

/**
 * Score a single activity
 * @param {object} activity - Strava activity object
 * @returns {number} points
 */
function scoreActivity(activity) {
  const config = SPORT_SCORES[activity.sport_type] ||
                 SPORT_SCORES[activity.type] ||
                 DEFAULT_SCORE;

  if (config.unit === 'km') {
    const km = (activity.distance || 0) / 1000;
    return Math.round(km * config.pts * 10) / 10;
  } else {
    // session-based: use moving time bonus (base pts + 1pt per 10 min)
    const minutes = Math.floor((activity.moving_time || 0) / 60);
    return config.pts + Math.floor(minutes / 10);
  }
}

/**
 * Summarize a list of activities into leaderboard stats
 * @param {Array} activities - Strava activities
 * @returns {object} summary
 */
function summarizeActivities(activities) {
  const summary = {
    totalPoints: 0,
    totalDistance: 0,     // meters
    totalElevation: 0,    // meters
    totalTime: 0,         // seconds
    activityCount: 0,
    byType: {},
  };

  for (const act of activities) {
    const pts = scoreActivity(act);
    const config = SPORT_SCORES[act.sport_type] || SPORT_SCORES[act.type] || DEFAULT_SCORE;
    const label = config.label;

    summary.totalPoints += pts;
    summary.totalDistance += act.distance || 0;
    summary.totalElevation += act.total_elevation_gain || 0;
    summary.totalTime += act.moving_time || 0;
    summary.activityCount += 1;

    if (!summary.byType[label]) {
      summary.byType[label] = { count: 0, distance: 0, points: 0 };
    }
    summary.byType[label].count += 1;
    summary.byType[label].distance += act.distance || 0;
    summary.byType[label].points += pts;
  }

  summary.totalPoints = Math.round(summary.totalPoints * 10) / 10;
  return summary;
}

module.exports = { scoreActivity, summarizeActivities, SPORT_SCORES };
