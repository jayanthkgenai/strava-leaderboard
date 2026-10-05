/**
 * roast.js — Roast My Workouts frontend
 */

let roastPeriod = 'week';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Load and display roasts ───────────────────────────────────
async function loadRoast(period) {
  roastPeriod = period || roastPeriod;

  const container = document.getElementById('roast-results');
  const statsEl   = document.getElementById('roast-stats');
  const btn       = document.getElementById('btn-roast-me');

  container.innerHTML = '<div class="roast-loading">🔥 Analyzing your shame...</div>';
  statsEl.innerHTML   = '';
  btn.disabled        = true;
  btn.textContent     = '🔥 Roasting...';

  try {
    const res  = await fetch(`/api/roast?period=${roastPeriod}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    // Stats bar
    statsEl.innerHTML = `
      <div class="roast-stat-bar">
        <span>📅 ${roastPeriod === 'week' ? 'This week' : 'This month'}</span>
        <span>🏃 ${data.stats.activities} activities</span>
        <span>📏 ${data.stats.totalDistKm} km</span>
        ${data.stats.avgPace ? `<span>⚡ ${data.stats.avgPace}/km avg pace</span>` : ''}
      </div>`;

    // Roast cards
    container.innerHTML = data.roasts.map((roast, i) => `
      <div class="roast-card" style="animation-delay:${i * 0.1}s">
        <span class="roast-number">${i + 1}</span>
        <p>${escapeHtml(roast)}</p>
      </div>`).join('');

    // Share button
    document.getElementById('roast-share-row').style.display = 'flex';

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <div>Could not generate roast — ${escapeHtml(err.message)}</div>
      </div>`;
  } finally {
    btn.disabled    = false;
    btn.textContent = '🔥 Roast me again';
  }
}

// ── Share roast as text ───────────────────────────────────────
function shareRoast() {
  const cards = document.querySelectorAll('.roast-card p');
  if (!cards.length) return;

  const name   = window.App.athlete?.name?.split(' ')[0] || 'Athlete';
  const text   = `${name}'s workout roast on StravaBoard:\n\n` +
    [...cards].map((c, i) => `${i + 1}. ${c.textContent}`).join('\n') +
    '\n\n🏅 stravaboard — strava-leaderboard-production-ae3f.up.railway.app';

  if (navigator.share) {
    navigator.share({ title: 'My Workout Roast 🔥', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Roast copied to clipboard 🔥', 'success');
    });
  }
}

// ── Period toggles ────────────────────────────────────────────
document.querySelectorAll('#roast-period-toggle .toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#roast-period-toggle .toggle-btn')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    roastPeriod = btn.dataset.period;
  });
});

document.getElementById('btn-roast-me')?.addEventListener('click', () => loadRoast(roastPeriod));
document.getElementById('btn-share-roast')?.addEventListener('click', shareRoast);

window.loadRoastPage = function() {
  // Reset state when navigating to page
  document.getElementById('roast-results').innerHTML = `
    <div class="empty-state">
      <div class="icon">🔥</div>
      <div>Hit the button and prepare to be roasted</div>
    </div>`;
  document.getElementById('roast-stats').innerHTML   = '';
  document.getElementById('roast-share-row').style.display = 'none';
  const btn = document.getElementById('btn-roast-me');
  if (btn) { btn.disabled = false; btn.textContent = '🔥 Roast my workouts'; }
};
