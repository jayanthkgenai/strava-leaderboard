/**
 * ypco.js — YPCO Shame Wall frontend
 */

const YPCO_EMOJIS = ['😂', '🤣', '😤', '🫣', '💀', '🙈', '👎', '🏳️'];

// ── Excuse options ────────────────────────────────────────────
const YPCO_EXCUSES = [
  { id: 'sick',     label: '🤒 Not feeling well',              icon: '🤒' },
  { id: 'poop',     label: '💩 Poop issues',                   icon: '💩' },
  { id: 'dinner',   label: '🍖 Last night heavy dinner',       icon: '🍖' },
  { id: 'function', label: '🏠 Surprise function at home',     icon: '🏠' },
  { id: 'bike',     label: '🚲 Bike issue / Bubble bathing',   icon: '🚲' },
  { id: 'niggle',   label: '🦵 Niggle in body parts',         icon: '🦵' },
  { id: 'other',    label: '✍️ Other (type below)',            icon: '✍️' },
];

// ── Reason-specific roast banks ───────────────────────────────
const EXCUSE_ROASTS = {
  sick: [
    "Sick on a workout day? Suspicious timing bro 🤔",
    "Miraculously recovers by lunch time every single time 🏥",
    "The illness that only shows up at 5:30am on run days 🎭",
    "WebMD diagnosis: chronic YPCO syndrome 📋",
    "Not feeling well = not feeling like working out. We see you 👀",
  ],
  poop: [
    "Poop issues. The classic. The timeless excuse 💩",
    "Your stomach knew the route was going to be hilly 💩😂",
    "The runs... but not the kind we planned 💩🏃",
    "Gastric courage: 0. YPCO courage: 100 💩",
    "Your gut has better cardio than you do 💩",
    "Plot twist: the only running happening today was to the bathroom 💩",
  ],
  dinner: [
    "Last night's biriyani > this morning's run. At least be honest 🍛",
    "You fed your stomach more than your Strava last night 🍖",
    "The dinner was heavy. The guilt is heavier. 🍽️",
    "A true athlete eats light the night before. Just saying. 🥗",
    "The restaurant deserves more Strava kudos than you today 🍽️🏅",
    "Carb loading taken to a whole new level 🍚💀",
  ],
  function: [
    "A function you were 'not aware of'. Sure bro. Sure. 🏠😂",
    "Suddenly has a function EVERY time there's a 6am run 🤔",
    "The function had better attendance than your workout ever did 🎉",
    "Family function > group run. We respect it. We also roast it. 🏠🔥",
    "Convenient timing on that function huh 📅",
  ],
  bike: [
    "Bubble bathing at 5:30am. Living your best life 🛁",
    "The bike has a flat. Coincidentally only on run days. 🚲",
    "Bike issue = too comfortable in bed issue 🛏️🚲",
    "The bubble bath was longer than your longest ride 🛁🚴",
    "Your bike called. It's fine. You're just not. 🚲😂",
    "Technical difficulties: bike issue, motivation issue, alarm issue... 🔧",
  ],
  niggle: [
    "Niggle in body parts 😂 Which part today? The 'get out of bed' muscle? 🦵",
    "The niggle that specifically attacks on group run days 🦵🎯",
    "Body parts niggling but somehow fine for Netflix and dinner later 📺",
    "Every athlete has niggles. Champions run through them. Just saying. 🦵💪",
    "The knee that's fine on weekdays but acts up every Saturday morning 🦵😅",
    "Consulting Dr. Bed rest again I see 🛏️🩺",
  ],
  other: [
    "Couldn't even be bothered to pick a real excuse 😂",
    "The creativity of the excuse matches the creativity of your training 🎨",
    "A mystery excuse for a mysterious disappearance 🕵️",
    "At least the others had the decency to give a reason 😤",
    "The audacity of a custom excuse deserves a custom roast 🔥",
  ],
};

const GENERIC_ROASTS = [
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

function getAutoRoast(excuseId) {
  const bank = EXCUSE_ROASTS[excuseId] || GENERIC_ROASTS;
  return bank[Math.floor(Math.random() * bank.length)];
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

        <div class="auto-roast">🔥 ${getAutoRoast(y.excuseId)}</div>

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
  const event     = document.getElementById('ypco-event').value.trim();
  const excuseId  = document.querySelector('.excuse-chip.selected')?.dataset.excuse;
  const freeText  = document.getElementById('ypco-freetext')?.value.trim();

  if (!event) { showToast('Tell us what you bailed on 😤', 'error'); return; }
  if (!excuseId) { showToast('Pick an excuse — we know you have one 😂', 'error'); return; }

  // Build the reason string
  const excuseLabel = YPCO_EXCUSES.find(e => e.id === excuseId)?.label || excuseId;
  const reason = excuseId === 'other' && freeText
    ? freeText
    : excuseId === 'other'
      ? 'No further details given 🤷'
      : excuseLabel;

  const btn = document.getElementById('btn-declare-ypco');
  btn.disabled = true;
  btn.textContent = '🏳️ Declaring shame...';

  try {
    const res = await fetch('/api/ypco', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, reason, excuseId }),
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Already YPCO\'d today!', 'error');
    } else {
      showToast('🏳️ YPCO declared. Shame on you! 😂', 'success');
      document.getElementById('ypco-event').value = '';
      if (document.getElementById('ypco-freetext')) document.getElementById('ypco-freetext').value = '';
      document.querySelectorAll('.excuse-chip').forEach(c => c.classList.remove('selected'));
      document.getElementById('ypco-freetext-row').style.display = 'none';
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
  const isHidden = form.style.display === 'none';
  form.style.display = isHidden ? 'block' : 'none';

  // Render excuse chips on first open
  if (isHidden) renderExcuseChips();
});

function renderExcuseChips() {
  const container = document.getElementById('excuse-chips');
  if (!container || container.children.length > 0) return; // already rendered

  container.innerHTML = YPCO_EXCUSES.map(e => `
    <button class="excuse-chip" data-excuse="${e.id}" onclick="selectExcuse(this, '${e.id}')">
      ${e.label}
    </button>`).join('');
}

function selectExcuse(chip, excuseId) {
  // Deselect all, select this one
  document.querySelectorAll('.excuse-chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');

  // Show free text only for 'other'
  const freetextRow = document.getElementById('ypco-freetext-row');
  freetextRow.style.display = excuseId === 'other' ? 'flex' : 'none';
  if (excuseId === 'other') {
    document.getElementById('ypco-freetext')?.focus();
  }
}

document.getElementById('btn-declare-ypco')?.addEventListener('click', declareYPCO);

// Expose for inline onclick handlers
window.reactYPCO    = reactYPCO;
window.sendRoast    = sendRoast;
window.loadYPCOWall = loadYPCOWall;
window.selectExcuse = selectExcuse;
