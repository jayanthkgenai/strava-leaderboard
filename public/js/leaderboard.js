/**
 * leaderboard.js — Group rankings with period + sort toggles
 */

let lbState = {
  period: 'weekly',
  sort: 'points',
  data: [],
  syncing: false,
  lastSync: null,
};

// ── Sync current user's score to Redis ───────────────────────
async function syncScore() {
  if (lbState.syncing) return;
  lbState.syncing = true;

  const btn = document.getElementById('btn-sync');
  const status = document.getElementById('sync-status');
  btn.disabled = true;
  btn.textContent = '⏳ Syncing...';

  try {
    const res = await fetch('/api/leaderboard/sync', { method: 'POST' });
    if (!res.ok) throw new Error('Sync failed');
    const data = await res.json();

    lbState.lastSync = Date.now();
    const pts = data.entry?.weekly?.totalPoints ?? 0;
    status.textContent = `✅ Synced! Your weekly score: ${pts} pts`;
    btn.textContent = '✅ Synced';
    showToast(`Synced! ${pts} points this week`, 'success');

    // Reload leaderboard with fresh data
    await fetchAndRenderLeaderboard();
  } catch (err) {
    status.textContent = '⚠️ Sync failed — try again';
    btn.textContent = '⚡ Retry sync';
    showToast('Sync failed', 'error');
  } finally {
    lbState.syncing = false;
    btn.disabled = false;
  }
}

// ── Fetch leaderboard from API ────────────────────────────────
async function fetchAndRenderLeaderboard() {
  try {
    const res = await fetch(`/api/leaderboard?period=${lbState.period}&sort=${lbState.sort}`);
    if (!res.ok) throw new Error('Failed to load leaderboard');
    const json = await res.json();
    lbState.data = json.leaderboard || [];
    renderLeaderboard(lbState.data);
  } catch (err) {
    document.getElementById('leaderboard-container').innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <div>Could not load leaderboard. Try syncing your score first.</div>
      </div>`;
  }
}

// ── Render leaderboard table ──────────────────────────────────
function renderLeaderboard(entries) {
  const container = document.getElementById('leaderboard-container');
  const myId = window.App.athlete?.id;

  if (!entries.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🏆</div>
        <div>No scores yet this ${lbState.period === 'weekly' ? 'week' : 'month'}.</div>
        <div style="margin-top:0.5rem;font-size:0.85rem;color:var(--muted)">Hit "Sync my score" to be the first!</div>
      </div>`;
    return;
  }

  const sortLabel = { points: 'Points', distance: 'Distance (km)', elevation: 'Elevation (m)', activities: 'Activities' };

  const rows = entries.map(e => {
    const isMe = String(e.athleteId) === String(myId);
    const rankClass = e.rank <= 3 ? `rank-${e.rank}` : 'rank-other';

    // Build discipline pills from byType
    const pills = Object.entries(e.byType || {})
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 4)
      .map(([label, d]) => `<span class="discipline-pill">${label} ×${d.count}</span>`)
      .join('');

    const updatedAgo = timeAgo(e.updatedAt);

    return `
      <tr class="${isMe ? 'me' : ''}">
        <td><span class="rank-badge ${rankClass}">${e.rank}</span></td>
        <td>
          <img class="lb-avatar" src="${escapeHtml(e.avatar || '')}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\'/>'" />
          <strong>${escapeHtml(e.name)}</strong>
          ${isMe ? ' <span style="color:var(--orange);font-size:0.75rem">(you)</span>' : ''}
          <div style="font-size:0.72rem;color:var(--muted);margin-top:0.15rem">${escapeHtml(e.city || '')}</div>
        </td>
        <td><span class="points-value">${e.points}</span></td>
        <td>${e.distance} km</td>
        <td class="col-elevation">${e.elevation.toLocaleString()} m</td>
        <td>${e.activities}</td>
        <td class="col-time">${e.time} h</td>
        <td class="col-disciplines">
          <div class="discipline-pills">${pills || '<span class="discipline-pill">No data</span>'}</div>
        </td>
        <td style="font-size:0.72rem;color:var(--muted)">${updatedAgo}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="lb-table">
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Athlete</th>
          <th class="${lbState.sort === 'points' ? 'sorted' : ''}" data-sort="points">Points ↕</th>
          <th class="${lbState.sort === 'distance' ? 'sorted' : ''}" data-sort="distance">Distance ↕</th>
          <th class="col-elevation ${lbState.sort === 'elevation' ? 'sorted' : ''}" data-sort="elevation">Elevation ↕</th>
          <th class="${lbState.sort === 'activities' ? 'sorted' : ''}" data-sort="activities">Activities ↕</th>
          <th class="col-time">Time</th>
          <th class="col-disciplines">Disciplines</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:0.75rem;font-size:0.78rem;color:var(--muted);text-align:right">
      ${entries.length} athlete${entries.length !== 1 ? 's' : ''} on the board
      · Scoring: Run 3pts/km · Ride 1pt/km · Swim 10pts/km · Gym 15pts/session
    </div>`;

  // Column sort click handlers
  container.querySelectorAll('th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      lbState.sort = th.dataset.sort;
      updateSortToggle(lbState.sort);
      const sorted = [...lbState.data].sort((a, b) => b[lbState.sort] - a[lbState.sort])
        .map((e, i) => ({ ...e, rank: i + 1 }));
      renderLeaderboard(sorted);
    });
  });
}

// ── Toggle helpers ────────────────────────────────────────────
function updatePeriodToggle(period) {
  document.querySelectorAll('#period-toggle .toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });
}

function updateSortToggle(sort) {
  document.querySelectorAll('#sort-toggle .toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sort === sort);
  });
}

// ── Time ago helper ───────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event listeners ───────────────────────────────────────────
document.getElementById('btn-sync').addEventListener('click', syncScore);

document.querySelectorAll('#period-toggle .toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    lbState.period = btn.dataset.period;
    updatePeriodToggle(lbState.period);
    fetchAndRenderLeaderboard();
  });
});

document.querySelectorAll('#sort-toggle .toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    lbState.sort = btn.dataset.sort;
    updateSortToggle(lbState.sort);
    fetchAndRenderLeaderboard();
  });
});

// ── Entry point (called from app.js when navigating to leaderboard) ──
async function loadLeaderboard() {
  await fetchAndRenderLeaderboard();
}

window.loadLeaderboard = loadLeaderboard;
