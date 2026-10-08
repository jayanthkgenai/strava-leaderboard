/**
 * points.js — Points scoring reference table
 */

async function loadPoints() {
  const container = document.getElementById('points-table-container');
  container.innerHTML = '<div class="empty-state"><div class="icon">⭐</div><div>Loading scoring table...</div></div>';

  try {
    const res = await fetch('/api/scoring');
    const data = await res.json();

    // Group by unit type
    const distanceSports = data.scoring.filter(s => s.unit === 'km');
    const sessionSports  = data.scoring.filter(s => s.unit === 'session');

    const distRows = distanceSports
      .sort((a, b) => b.points - a.points)
      .map(s => `
        <tr>
          <td>${s.label}</td>
          <td><span class="pts-pill">${s.points} pts/km</span></td>
        </tr>`).join('');

    const sessRows = sessionSports
      .sort((a, b) => b.points - a.points)
      .map(s => `
        <tr>
          <td>${s.label}</td>
          <td><span class="pts-pill">${s.points} pts + 1/10min</span></td>
        </tr>`).join('');

    container.innerHTML = `
      <div class="points-section">
        <div class="section-title" style="margin-bottom:0.75rem">📏 Distance-based (points per km)</div>
        <table class="points-table">
          <thead><tr><th>Sport</th><th>Points</th></tr></thead>
          <tbody>${distRows}</tbody>
        </table>
      </div>

      <div class="points-section" style="margin-top:1.5rem">
        <div class="section-title" style="margin-bottom:0.75rem">🏋️ Session-based (base points + time bonus)</div>
        <table class="points-table">
          <thead><tr><th>Sport</th><th>Points</th></tr></thead>
          <tbody>${sessRows}</tbody>
        </table>
      </div>

      <div class="points-examples">
        <div class="section-title" style="margin-bottom:0.75rem">📊 Example calculations</div>
        <div class="example-row">🏃 A 10 km run = 10 × 3 = <strong>30 points</strong></div>
        <div class="example-row">🚴 A 40 km ride = 40 × 1 = <strong>40 points</strong></div>
        <div class="example-row">🏊 A 2 km swim = 2 × 10 = <strong>20 points</strong></div>
        <div class="example-row">🏋️ A 50 min gym session = 15 + 5 = <strong>20 points</strong></div>
        <div class="example-row">🏔️ A 15 km trail run = 15 × 4 = <strong>60 points</strong></div>
      </div>

      <div class="goal-tip" style="margin-top:1.5rem">
        🎯 Goal: Reach <strong>${data.goal} points</strong> (all-time, since Oct 1 2026) to qualify for the Kumara Parvatha trek ⛰️
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><div>Could not load scoring table</div></div>`;
  }
}

window.loadPoints = loadPoints;
