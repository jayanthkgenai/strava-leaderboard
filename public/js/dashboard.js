/**
 * dashboard.js — Personal stats, filterable activities, downloadable report
 */

async function loadDashboard() {
  await Promise.all([loadStats(), loadFilteredActivities(), loadGoalBanner()]);
}

// ── YTD Stats (clean 4-card grid) ─────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    const stats = await res.json();

    const runYTD  = stats.ytd_run_totals  || {};
    const rideYTD = stats.ytd_ride_totals || {};
    const swimYTD = stats.ytd_swim_totals || {};

    const totalDistanceM  = (runYTD.distance || 0) + (rideYTD.distance || 0) + (swimYTD.distance || 0);
    const totalTime       = (runYTD.moving_time || 0) + (rideYTD.moving_time || 0) + (swimYTD.moving_time || 0);
    const totalElev       = (runYTD.elevation_gain || 0) + (rideYTD.elevation_gain || 0);
    const totalActivities = (runYTD.count || 0) + (rideYTD.count || 0) + (swimYTD.count || 0);

    const cards = [
      { label: '📏 Total Distance', value: App.fmtDistance(totalDistanceM), sub: 'all sports · YTD' },
      { label: '⏱️ Moving Time',    value: App.fmtTime(totalTime),          sub: 'all sports · YTD' },
      { label: '⛰️ Elevation',      value: `${Math.round(totalElev).toLocaleString()} m`, sub: 'year to date' },
      { label: '🏃 Activities',     value: totalActivities,                 sub: `${runYTD.count||0} runs · ${rideYTD.count||0} rides · ${swimYTD.count||0} swims` },
    ];

    document.getElementById('ytd-stats').innerHTML = cards.map(c => `
      <div class="stat-card">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-sub">${c.sub}</div>
      </div>`).join('');
  } catch (err) {
    document.getElementById('ytd-stats').innerHTML =
      `<div class="stat-card"><div class="stat-label">Error loading stats</div></div>`;
  }
}

// ── Trek goal mini-banner on dashboard ────────────────────────
async function loadGoalBanner() {
  try {
    const res = await fetch('/api/progress');
    const p = await res.json();
    const banner = document.getElementById('goal-banner');

    if (p.lastSync == null) {
      banner.style.display = 'block';
      banner.innerHTML = `
        <span>⛰️ Sync your points on the <strong>Trek Goal</strong> tab to track your Kumara Parvatha qualification</span>`;
      return;
    }

    banner.style.display = 'block';
    banner.innerHTML = `
      <div class="goal-banner-row">
        <span>⛰️ Kumara Parvatha: <strong>${p.points}</strong> / ${p.goal} pts</span>
        <span class="goal-banner-status">${p.qualified ? '✅ Qualified!' : `${p.remaining} pts to go`}</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${p.pct}%"></div></div>`;
  } catch (err) {
    // silently skip banner
  }
}

// ── Filtered activities ───────────────────────────────────────
async function loadFilteredActivities() {
  const period = document.getElementById('filter-period')?.value || 'month';
  const type   = document.getElementById('filter-type')?.value || 'all';

  const list = document.getElementById('recent-activities');
  list.innerHTML = '<div class="stat-card skeleton" style="height:64px"></div>'.repeat(3);
  document.getElementById('filter-summary').innerHTML = '';

  try {
    const res = await fetch(`/api/activities?period=${period}&type=${type}`);
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    const activities = data.activities || [];

    // Summary line
    const totalDist = activities.reduce((s, a) => s + (a.distance || 0), 0);
    const totalTime = activities.reduce((s, a) => s + (a.moving_time || 0), 0);
    document.getElementById('filter-summary').innerHTML =
      `<span>${activities.length} activities</span> · <span>${App.fmtDistance(totalDist)}</span> · <span>${App.fmtTime(totalTime)}</span>`;

    if (!activities.length) {
      list.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><div>No activities match this filter</div></div>`;
      return;
    }

    list.innerHTML = activities.slice(0, 50).map(act => {
      const distStr = act.distance > 0 ? App.fmtDistance(act.distance) : '—';
      const isRun = act.type === 'Run' || act.type === 'TrailRun';
      const paceStr = isRun
        ? App.fmtPace(act.distance, act.moving_time)
        : act.average_speed ? `${(act.average_speed * 3.6).toFixed(1)} km/h` : '—';

      return `
        <div class="activity-item">
          <div class="activity-icon">${App.sportIcon(act.sport_type || act.type)}</div>
          <div class="activity-info">
            <div class="activity-name">${escapeHtml(act.name)}</div>
            <div class="activity-meta">${App.fmtDate(act.start_date_local)} · ${App.fmtTime(act.moving_time)}</div>
          </div>
          <div class="activity-stats">
            <div><div class="activity-stat-val">${distStr}</div><div class="activity-stat-lbl">distance</div></div>
            <div><div class="activity-stat-val">${paceStr}</div><div class="activity-stat-lbl">${isRun ? 'pace' : 'speed'}</div></div>
            <div><div class="activity-stat-val">${Math.round(act.total_elevation_gain || 0)} m</div><div class="activity-stat-lbl">elev</div></div>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><div>Could not load activities</div></div>`;
  }
}

// ── Downloadable progress report ──────────────────────────────
async function downloadReport() {
  const btn = document.getElementById('btn-download-report');
  btn.disabled = true;
  btn.textContent = '📸 Building...';

  try {
    // Fetch fresh data for the report
    const [statsRes, progRes] = await Promise.all([
      fetch('/api/stats'), fetch('/api/progress'),
    ]);
    const stats = await statsRes.json();
    const prog  = await progRes.json();

    const runYTD  = stats.ytd_run_totals  || {};
    const rideYTD = stats.ytd_ride_totals || {};
    const swimYTD = stats.ytd_swim_totals || {};
    const totalDist = (runYTD.distance||0)+(rideYTD.distance||0)+(swimYTD.distance||0);
    const totalTime = (runYTD.moving_time||0)+(rideYTD.moving_time||0)+(swimYTD.moving_time||0);

    // Build an off-screen report card
    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
      <div class="report-header">
        <img src="${window.App.athlete.avatar || ''}" class="report-avatar" crossorigin="anonymous" />
        <div>
          <div class="report-name">${escapeHtml(window.App.athlete.name)}</div>
          <div class="report-sub">StravaBoard Progress Report</div>
        </div>
        <div class="report-logo">🏅</div>
      </div>
      <div class="report-stats">
        <div class="report-stat"><div class="rs-val">${App.fmtDistance(totalDist)}</div><div class="rs-lbl">Distance YTD</div></div>
        <div class="report-stat"><div class="rs-val">${App.fmtTime(totalTime)}</div><div class="rs-lbl">Moving Time</div></div>
        <div class="report-stat"><div class="rs-val">${runYTD.count||0}</div><div class="rs-lbl">Runs</div></div>
        <div class="report-stat"><div class="rs-val">${rideYTD.count||0}</div><div class="rs-lbl">Rides</div></div>
      </div>
      <div class="report-goal">
        <div class="report-goal-title">⛰️ Kumara Parvatha Trek Goal</div>
        <div class="report-goal-pts">${prog.points} / ${prog.goal} pts ${prog.qualified ? '✅ QUALIFIED' : ''}</div>
        <div class="report-track"><div class="report-fill" style="width:${prog.pct}%"></div></div>
        <div class="report-goal-sub">${prog.qualified ? 'Trek unlocked! 🏔️' : `${prog.remaining} points to qualify`}</div>
      </div>
      <div class="report-footer">stravaboard · ${new Date().toLocaleDateString()}</div>`;

    document.body.appendChild(card);

    const canvas = await html2canvas(card, { backgroundColor: '#0f0f0f', scale: 2, useCORS: true });
    document.body.removeChild(card);

    const link = document.createElement('a');
    link.download = `stravaboard-report-${window.App.athlete.name.split(' ')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    showToast('Report downloaded 📸', 'success');
  } catch (err) {
    console.error(err);
    showToast('Could not generate report', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📸 Download Report';
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Wire up filter + download ─────────────────────────────────
document.getElementById('filter-period')?.addEventListener('change', loadFilteredActivities);
document.getElementById('filter-type')?.addEventListener('change', loadFilteredActivities);
document.getElementById('btn-download-report')?.addEventListener('click', downloadReport);

window.loadDashboard = loadDashboard;
