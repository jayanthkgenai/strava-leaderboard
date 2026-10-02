/**
 * dashboard.js — Personal stats & recent activities
 */

async function loadDashboard() {
  await Promise.all([loadStats(), loadRecentActivities()]);
}

// ── YTD Stats ─────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    const stats = await res.json();

    const runYTD = stats.ytd_run_totals || {};
    const rideYTD = stats.ytd_ride_totals || {};
    const swimYTD = stats.ytd_swim_totals || {};

    const totalDistanceM = (runYTD.distance || 0) + (rideYTD.distance || 0) + (swimYTD.distance || 0);
    const totalTime = (runYTD.moving_time || 0) + (rideYTD.moving_time || 0) + (swimYTD.moving_time || 0);
    const totalElev = (runYTD.elevation_gain || 0) + (rideYTD.elevation_gain || 0);
    const totalActivities = (runYTD.count || 0) + (rideYTD.count || 0) + (swimYTD.count || 0);

    const cards = [
      {
        label: 'Total Distance',
        value: App.fmtDistance(totalDistanceM),
        sub: `${App.fmtDistance(runYTD.distance || 0)} running`,
      },
      {
        label: 'Moving Time',
        value: App.fmtTime(totalTime),
        sub: `across all sports`,
      },
      {
        label: 'Elevation',
        value: `${Math.round(totalElev).toLocaleString()} m`,
        sub: `year to date`,
      },
      {
        label: 'Activities',
        value: totalActivities,
        sub: `${runYTD.count || 0} runs · ${rideYTD.count || 0} rides`,
      },
      {
        label: '🏃 Run YTD',
        value: App.fmtDistance(runYTD.distance || 0),
        sub: `${runYTD.count || 0} runs`,
      },
      {
        label: '🚴 Ride YTD',
        value: App.fmtDistance(rideYTD.distance || 0),
        sub: `${rideYTD.count || 0} rides`,
      },
      {
        label: '🏊 Swim YTD',
        value: App.fmtDistance(swimYTD.distance || 0),
        sub: `${swimYTD.count || 0} swims`,
      },
      {
        label: 'All-Time Distance',
        value: App.fmtDistance((stats.all_run_totals?.distance || 0) + (stats.all_ride_totals?.distance || 0)),
        sub: `all sports combined`,
      },
    ];

    const container = document.getElementById('ytd-stats');
    container.innerHTML = cards.map(c => `
      <div class="stat-card">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-sub">${c.sub}</div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('ytd-stats').innerHTML =
      `<div class="stat-card"><div class="stat-label">Error loading stats</div></div>`;
  }
}

// ── Recent Activities ─────────────────────────────────────────
async function loadRecentActivities() {
  try {
    const res = await fetch('/api/recent');
    if (!res.ok) throw new Error('Failed');
    const activities = await res.json();

    if (!activities.length) {
      document.getElementById('recent-activities').innerHTML =
        `<div class="empty-state"><div class="icon">😴</div><div>No recent activities found</div></div>`;
      return;
    }

    const html = activities.map(act => {
      const isDistance = act.distance > 0;
      const distStr = isDistance ? App.fmtDistance(act.distance) : '—';
      const paceStr = (act.type === 'Run' || act.type === 'TrailRun')
        ? App.fmtPace(act.distance, act.moving_time)
        : act.average_speed
          ? `${(act.average_speed * 3.6).toFixed(1)} km/h`
          : '—';

      return `
        <div class="activity-item">
          <div class="activity-icon">${App.sportIcon(act.sport_type || act.type)}</div>
          <div class="activity-info">
            <div class="activity-name">${escapeHtml(act.name)}</div>
            <div class="activity-meta">${App.fmtDate(act.start_date_local)} · ${App.fmtTime(act.moving_time)}</div>
          </div>
          <div class="activity-stats">
            <div>
              <div class="activity-stat-val">${distStr}</div>
              <div class="activity-stat-lbl">distance</div>
            </div>
            <div>
              <div class="activity-stat-val">${paceStr}</div>
              <div class="activity-stat-lbl">${act.type === 'Run' ? 'pace' : 'speed'}</div>
            </div>
            <div>
              <div class="activity-stat-val">${Math.round(act.total_elevation_gain || 0)} m</div>
              <div class="activity-stat-lbl">elev</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('recent-activities').innerHTML = html;
  } catch (err) {
    document.getElementById('recent-activities').innerHTML =
      `<div class="empty-state"><div class="icon">⚠️</div><div>Could not load activities</div></div>`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.loadDashboard = loadDashboard;
