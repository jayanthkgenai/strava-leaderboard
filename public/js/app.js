/**
 * app.js — Bootstrap, routing, shared utilities
 */

// ── Shared State ──────────────────────────────────────────────
window.App = {
  athlete: null,
  currentPage: 'dashboard',
};

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = 'toast'; }, 3000);
}
window.showToast = showToast;

// ── Routing ───────────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const linkEl = document.querySelector(`.nav-link[data-page="${page}"]`);

  if (pageEl) pageEl.classList.add('active');
  if (linkEl) linkEl.classList.add('active');

  window.App.currentPage = page;
  history.pushState({ page }, '', `/${page}`);

  if (page === 'leaderboard') window.loadLeaderboard?.();
  if (page === 'goal')        window.loadGoal?.();
  if (page === 'points')      window.loadPoints?.();
  if (page === 'events')      window.loadEvents?.();
  if (page === 'roast')       window.loadRoastPage?.();
}

document.querySelectorAll('.nav-link').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

window.addEventListener('popstate', (e) => {
  const page = e.state?.page || 'dashboard';
  navigateTo(page);
});

// ── Helpers ───────────────────────────────────────────────────
function fmtDistance(meters) {
  const km = meters / 1000;
  return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

function fmtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function fmtPace(meters, seconds) {
  if (!meters || !seconds) return '—';
  const secPerKm = seconds / (meters / 1000);
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')}/km`;
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function sportIcon(type) {
  const icons = {
    Run: '🏃', TrailRun: '🏔️', VirtualRun: '🖥️',
    Ride: '🚴', MountainBikeRide: '🚵', GravelRide: '🚵', VirtualRide: '🖥️', EBikeRide: '⚡',
    Swim: '🏊',
    WeightTraining: '🏋️', Workout: '💪', Crossfit: '🔥', Yoga: '🧘', Pilates: '🧘',
    Elliptical: '🏃', StairStepper: '🪜', RockClimbing: '🧗',
    Hike: '🥾', Walk: '🚶',
    NordicSki: '⛷️', AlpineSki: '🎿',
    Rowing: '🚣', Kayaking: '🛶',
    Soccer: '⚽', Tennis: '🎾', Badminton: '🏸', Surfing: '🏄',
  };
  return icons[type] || '🏅';
}

window.App.fmtDistance = fmtDistance;
window.App.fmtTime = fmtTime;
window.App.fmtPace = fmtPace;
window.App.fmtDate = fmtDate;
window.App.sportIcon = sportIcon;

// ── Init ──────────────────────────────────────────────────────
async function init() {
  const res = await fetch('/api/session');
  const data = await res.json();

  if (!data.loggedIn) {
    document.getElementById('landing').style.display = 'flex';
    return;
  }

  window.App.athlete = data.athlete;

  // Show app shell
  document.getElementById('app').style.display = 'flex';
  document.getElementById('app').classList.add('visible');

  // Set nav user info
  document.getElementById('nav-avatar').src = data.athlete.avatar || '';
  document.getElementById('nav-avatar').alt = data.athlete.name;
  document.getElementById('nav-name').textContent = data.athlete.name.split(' ')[0];

  // Set profile header
  document.getElementById('profile-avatar').src = data.athlete.avatar || '';
  document.getElementById('profile-name').textContent = data.athlete.name;
  document.getElementById('profile-loc').textContent =
    [data.athlete.city, data.athlete.country].filter(Boolean).join(', ');

  // Determine which page to show
  const path = window.location.pathname.replace('/', '') || 'dashboard';
  navigateTo(['dashboard', 'leaderboard', 'goal', 'points', 'roast', 'events'].includes(path) ? path : 'dashboard');

  // Load dashboard data
  window.loadDashboard?.();
}

init().catch(console.error);
