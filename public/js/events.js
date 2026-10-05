/**
 * events.js — Group Events Board frontend
 */

const DISCIPLINE_ICONS = {
  Run: '🏃', Ride: '🚴', Swim: '🏊', Multi: '🏅', Triathlon: '🏅', Other: '🎯'
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtEventDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const event = new Date(dateStr + 'T00:00:00');
  const diff  = Math.round((event - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '<span style="color:var(--orange)">Today!</span>';
  if (diff === 1) return '<span style="color:var(--orange)">Tomorrow!</span>';
  if (diff <= 7)  return `<span style="color:var(--yellow)">${diff} days away</span>`;
  return `<span style="color:var(--muted)">${diff} days away</span>`;
}

// ── Render events ─────────────────────────────────────────────
function renderEvents(events) {
  const container = document.getElementById('events-list');
  const myId      = window.App.athlete?.id;
  const myName    = window.App.athlete?.name;

  if (!events.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📅</div>
        <div>No upcoming events yet</div>
        <div style="margin-top:0.5rem;font-size:0.85rem;color:var(--muted)">
          Be the first to add a race or event for the group!
        </div>
      </div>`;
    return;
  }

  container.innerHTML = events.map(e => {
    const icon      = DISCIPLINE_ICONS[e.discipline] || '🎯';
    const isGoing   = (e.interested || []).includes(myName);
    const isOwner   = String(e.addedById) === String(myId);
    const goingList = e.interested?.length
      ? e.interested.slice(0, 5).join(', ') + (e.interested.length > 5 ? ` +${e.interested.length - 5} more` : '')
      : 'No one yet — be the first!';

    return `
      <div class="event-card" id="event-${e.id}">
        <div class="event-header">
          <div class="event-icon">${icon}</div>
          <div class="event-info">
            <div class="event-title">${escapeHtml(e.title)}</div>
            <div class="event-date">
              📅 ${fmtEventDate(e.date)} · ${daysUntil(e.date)}
            </div>
            ${e.location ? `<div class="event-location">📍 ${escapeHtml(e.location)}</div>` : ''}
          </div>
          <div class="event-discipline-badge">${escapeHtml(e.discipline)}</div>
        </div>

        ${e.description ? `<div class="event-desc">${escapeHtml(e.description)}</div>` : ''}

        <div class="event-going">
          <span class="going-label">👥 Going:</span>
          <span class="going-names">${escapeHtml(goingList)}</span>
        </div>

        <div class="event-actions">
          ${e.url ? `
            <a href="${escapeHtml(e.url)}" target="_blank" rel="noopener noreferrer" class="btn-register">
              🔗 Register / More Info
            </a>` : ''}
          <button class="btn-going ${isGoing ? 'going' : ''}"
            onclick="toggleInterested('${e.id}', this)">
            ${isGoing ? '✅ I\'m going' : '🙋 Count me in'}
          </button>
          ${isOwner ? `
            <button class="btn-delete-event" onclick="deleteEvent('${e.id}', this)">
              🗑️ Delete
            </button>` : ''}
        </div>

        <div class="event-added-by">Added by ${escapeHtml(e.addedBy)}</div>
      </div>`;
  }).join('');
}

// ── Load events ───────────────────────────────────────────────
async function loadEvents() {
  document.getElementById('events-list').innerHTML =
    '<div class="stat-card skeleton" style="height:160px"></div>'.repeat(2);
  try {
    const res  = await fetch('/api/events');
    const data = await res.json();
    renderEvents(data.events || []);
  } catch (err) {
    document.getElementById('events-list').innerHTML =
      `<div class="empty-state"><div class="icon">⚠️</div><div>Failed to load events</div></div>`;
  }
}

// ── Toggle interested ─────────────────────────────────────────
async function toggleInterested(id, btn) {
  btn.disabled = true;
  try {
    const res  = await fetch(`/api/events/${id}/interested`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      const myName = window.App.athlete?.name;
      const going  = data.interested.includes(myName);
      btn.textContent = going ? '✅ I\'m going' : '🙋 Count me in';
      btn.classList.toggle('going', going);
      showToast(going ? 'You\'re in! 🎉' : 'Removed from going list', going ? 'success' : 'info');
      await loadEvents();
    }
  } catch (err) {
    showToast('Failed to update', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ── Delete event ──────────────────────────────────────────────
async function deleteEvent(id, btn) {
  if (!confirm('Delete this event?')) return;
  btn.disabled = true;
  try {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Event deleted', 'success');
      await loadEvents();
    } else {
      showToast(data.error || 'Failed to delete', 'error');
    }
  } catch (err) {
    showToast('Failed to delete', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ── Add event form ────────────────────────────────────────────
document.getElementById('btn-show-add-event')?.addEventListener('click', () => {
  const form = document.getElementById('add-event-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('btn-add-event')?.addEventListener('click', async () => {
  const title      = document.getElementById('event-title').value.trim();
  const date       = document.getElementById('event-date').value;
  const location   = document.getElementById('event-location').value.trim();
  const url        = document.getElementById('event-url').value.trim();
  const desc       = document.getElementById('event-desc').value.trim();
  const discipline = document.getElementById('event-discipline').value;

  if (!title) { showToast('Event name is required', 'error'); return; }
  if (!date)  { showToast('Event date is required', 'error'); return; }

  const btn = document.getElementById('btn-add-event');
  btn.disabled    = true;
  btn.textContent = 'Adding...';

  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, location, url, description: desc, discipline }),
    });
    const data = await res.json();

    if (data.success) {
      showToast('Event added! 🎉', 'success');
      // Reset form
      ['event-title','event-date','event-location','event-url','event-desc'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      document.getElementById('add-event-form').style.display = 'none';
      await loadEvents();
    } else {
      showToast(data.error || 'Failed to add event', 'error');
    }
  } catch (err) {
    showToast('Failed to add event', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = '📅 Add Event';
  }
});

// Set minimum date to today
const dateInput = document.getElementById('event-date');
if (dateInput) {
  dateInput.min = new Date().toISOString().split('T')[0];
}

// Expose for nav routing
window.loadEvents      = loadEvents;
window.toggleInterested = toggleInterested;
window.deleteEvent     = deleteEvent;
