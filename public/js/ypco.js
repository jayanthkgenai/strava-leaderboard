/**
 * ypco.js — YPCO Shame Wall frontend
 */

const YPCO_EMOJIS = ['😂', '🤣', '😤', '🫣', '💀', '🙈', '👎', '🏳️'];

const YPCO_AUTO_ROASTS = [
  "Bro really set an alarm just to disappoint everyone 😴",
  "The audacity to say YPCO at 5:30am 🌅💀",
  "Your running shoes are filing for abandonment 👟😭",
  "Classic. Absolutely classic. 🎭",
  "The group chat will remember this 📱",
  "Even your shadow refused to come today 🏃‍♂️💨",
  "Your GPS has more steps than you today 📡",
  "The finish line is still waiting... 🏁",
  "Somewhere a treadmill is collecting dust in your honour 🏋️",
  "You were the weakest link. Goodbye. 👋",
];

function getAutoRoast() {
  return YPCO_AUTO_ROASTS[Math.floor(Math.random() * YPCO_AUTO_ROASTS.length)];
}

function timeAgo(ts) {
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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getBadge(count) {
  if (count >= 10) return '<span class="ypco-badge repeat">👑 Serial Offender</span>';
  if (count >= 5)  return '<span class="ypco-badge veteran">🏳️ Veteran Quitter</span>';
  if (count >= 3)  return '<span class="ypco-badge">😤 Repeat Offender</span>';
  return '';
}

// ── Render YPCO wall ──────────────────────────────────────────
function renderYPCOWall(ypcos) {
  const container = document.getElementById('ypco-wall');
  const myId = window.App.athlete?.id;

  if (!ypcos.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🏃</div>
        <div>No YPCOs this week — everyone showed up!</div>
        <div style="margin-top:0.5rem;font-size:0.85rem;color:var(--muted)">
          Be the first to bail... or don't 😤
        </div>
      </div>`;
    return;
  }

  container.innerHTML = ypcos.map(y => {
    const isMe = String(y.athleteId) === String(myId);
    const reactionHtml = YPCO_EMOJIS.map(e => `
      <button class="reaction-btn ${(y.reactions?.[e] || 0) > 0 ? 'active' : ''}"
        onclick="reactYPCO('${y.date}', '${y.athleteId}', '${e}', this)"
        ${isMe ? 'disabled title="Can\'t react to your own shame 😂"' : ''}>
        ${e} <span class="reaction-count">${y.reactions?.[e] || ''}</span>
      </button>`).join('');

    const roastsHtml = (y.roasts || []).map(r => `
      <div class="roast-comment">
        <strong>${escapeHtml(r.from)}:</strong> ${escapeHtml(r.message)}
        <span class="roast-time">${timeAgo(r.timestamp)}</span>
      </div>`).join('');

    return `
      <div class="ypco-card ${isMe ? 'mine' : ''}">
        <div class="ypco-header">
          <img class="lb-avatar" src="${escapeHtml(y.avatar || '')}" alt=""
            onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\'/>'"/>
          <div class="ypco-info">
            <div class="ypco-name">
              ${escapeHtml(y.name)}
              ${isMe ? '<span style="color:var(--orange);font-size:0.75rem">(you)</span>' : ''}
              ${getBadge(y.totalYPCOs || 1)}
            </div>
            <div class="ypco-meta">
              Bailed on: <strong>${escapeHtml(y.event)}</strong> · ${timeAgo(y.timestamp)}
              ${y.totalYPCOs > 1 ? `· <span style="color:#ef4444">${y.totalYPCOs} YPCOs total</span>` : ''}
            </div>
          </div>
          <div class="ypco-flag">🏳️ YPCO</div>
        </div>

        <div class="ypco-reason">
          💬 "${escapeHtml(y.reason)}"
        </div>

        <div class="auto-roast">🔥 ${getAutoRoast()}</div>

        <div class="ypco-reactions">${reactionHtml}</div>

        ${!isMe ? `
        <div class="roast-input-row">
          <input type="text" class="roast-input" id="roast-${y.date}-${y.athleteId}"
            placeholder="Leave a roast..." maxlength="200" />
          <button class="btn-roast-send"
            onclick="sendRoast('${y.date}', '${y.athleteId}', 'roast-${y.date}-${y.athleteId}', this)">
            🔥 Send
          </button>
        </div>` : ''}

        ${roastsHtml ? `<div class="roast-comments">${roastsHtml}</div>` : ''}
      </div>`;
  }).join('');
}

// ── Load YPCO wall ────────────────────────────────────────────
async function loadYPCOWall() {
  document.getElementById('ypco-wall').innerHTML =
    '<div class="stat-card skeleton" style="height:180px"></div>'.repeat(2);
  try {
    const res = await fetch('/api/ypco?days=7');
    const data = await res.json();
    renderYPCOWall(data.ypcos || []);
  } catch (err) {
    document.getElementById('ypco-wall').innerHTML =
      `<div class="empty-state"><div class="icon">⚠️</div><div>Failed to load shame wall</div></div>`;
  }
}

// ── Declare YPCO ──────────────────────────────────────────────
async function declareYPCO() {
  const event  = document.getElementById('ypco-event').value.trim();
  const reason = document.getElementById('ypco-reason').value.trim();

  if (!event) { showToast('Tell us what you bailed on 😤', 'error'); return; }
  if (!reason) { showToast('Give us an excuse at least 😂', 'error'); return; }

  const btn = document.getElementById('btn-declare-ypco');
  btn.disabled = true;
  btn.textContent = '🏳️ Declaring shame...';

  try {
    const res = await fetch('/api/ypco', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, reason }),
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Already YPCO\'d today!', 'error');
    } else {
      showToast('🏳️ YPCO declared. Shame on you! 😂', 'success');
      document.getElementById('ypco-event').value = '';
      document.getElementById('ypco-reason').value = '';
      document.getElementById('ypco-form').style.display = 'none';
      await loadYPCOWall();
    }
  } catch (err) {
    showToast('Failed to declare YPCO', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🏳️ Declare YPCO';
  }
}

// ── React to YPCO ─────────────────────────────────────────────
async function reactYPCO(date, athleteId, emoji, btn) {
  try {
    const res = await fetch(`/api/ypco/${date}/${athleteId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });
    const data = await res.json();
    if (data.reactions) {
      btn.classList.add('active');
      btn.querySelector('.reaction-count').textContent = data.reactions[emoji] || '';
    }
  } catch (err) {
    showToast('Reaction failed', 'error');
  }
}

// ── Send roast comment ────────────────────────────────────────
async function sendRoast(date, athleteId, inputId, btn) {
  const input = document.getElementById(inputId);
  const message = input?.value?.trim();
  if (!message) return;

  btn.disabled = true;
  try {
    const res = await fetch(`/api/ypco/${date}/${athleteId}/roast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.success) {
      input.value = '';
      showToast('Roast delivered 🔥', 'success');
      await loadYPCOWall();
    }
  } catch (err) {
    showToast('Failed to send roast', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ── Toggle YPCO form ──────────────────────────────────────────
document.getElementById('btn-show-ypco-form')?.addEventListener('click', () => {
  const form = document.getElementById('ypco-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('btn-declare-ypco')?.addEventListener('click', declareYPCO);

// Expose for inline onclick handlers
window.reactYPCO = reactYPCO;
window.sendRoast = sendRoast;
window.loadYPCOWall = loadYPCOWall;
