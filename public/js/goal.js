/**
 * goal.js — Kumara Parvatha trek goal page
 */

async function loadGoal() {
  const container = document.getElementById('goal-content');
  container.innerHTML = '<div class="empty-state"><div class="icon">⛰️</div><div>Loading your progress...</div></div>';

  try {
    const res = await fetch('/api/progress');
    const p = await res.json();

    if (p.lastSync == null) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">⛰️</div>
          <div>You haven't synced your points yet</div>
          <div style="margin-top:0.5rem;font-size:0.85rem;color:var(--muted)">
            Hit "⚡ Sync my points" above to see your trek qualification progress
          </div>
        </div>`;
      return;
    }

    const statusColor = p.qualified ? 'var(--green)' : 'var(--orange)';
    const byType = Object.entries(p.byType || {})
      .sort((a, b) => b[1].points - a[1].points)
      .map(([label, d]) => `
        <div class="breakdown-row">
          <span>${label}</span>
          <span><strong>${Math.round(d.points)}</strong> pts · ${d.count} activities</span>
        </div>`).join('');

    container.innerHTML = `
      <div class="goal-card">
        <div class="goal-big-number" style="color:${statusColor}">
          ${p.points} <span class="goal-of">/ ${p.goal} pts</span>
        </div>

        <div class="progress-track big">
          <div class="progress-fill" style="width:${p.pct}%;background:${statusColor}"></div>
        </div>
        <div class="goal-pct">${p.pct}% complete</div>

        ${p.qualified ? `
          <div class="goal-qualified">
            🎉 Congratulations! You've <strong>qualified</strong> for the Kumara Parvatha trek! ⛰️
          </div>` : `
          <div class="goal-remaining">
            🏔️ <strong>${p.remaining} points</strong> to go. Keep pushing — the summit awaits!
          </div>`}
      </div>

      <div class="section-header" style="margin-top:1.5rem">
        <div class="section-title">Your Points Breakdown</div>
      </div>
      <div class="breakdown-card">
        ${byType || '<div class="breakdown-row"><span>No activities yet</span></div>'}
      </div>

      <div class="goal-tip">
        💡 Tip: Points come from all activities since Oct 1, 2026. Trail runs (4 pts/km) and gym sessions (15 pts) earn the most. See the <strong>⭐ Points</strong> tab for the full table.
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><div>Could not load progress</div></div>`;
  }
}

// Sync button on goal page triggers the leaderboard sync (which populates alltime)
document.getElementById('btn-sync-goal')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-sync-goal');
  btn.disabled = true;
  btn.textContent = '⏳ Syncing...';
  try {
    const res = await fetch('/api/leaderboard/sync', { method: 'POST' });
    if (!res.ok) throw new Error('Sync failed');
    showToast('Points synced! ⛰️', 'success');
    await loadGoal();
  } catch (err) {
    showToast('Sync failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Sync my points';
  }
});

window.loadGoal = loadGoal;
