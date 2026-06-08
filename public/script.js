const GUESTS = [
  { name: 'Maddison', relation: 'School Friend', emoji: '👧' },
  { name: 'Lukas',    relation: 'School Friend', emoji: '👦' },
  { name: 'Ryan',     relation: 'School Friend', emoji: '👦' },
  { name: 'Raya',     relation: 'School Friend', emoji: '👧' },
  { name: 'Milan',    relation: 'School Friend', emoji: '🧒' },
  { name: 'Bella',    relation: 'School Friend', emoji: '👧' },
];

// ── Render guests ──────────────────────────────────────────
function renderGuests() {
  document.getElementById('guest-grid').innerHTML = GUESTS.map(g => `
    <div class="guest-card">
      <div class="guest-avatar">${g.emoji}</div>
      <div class="name">${g.name}</div>
      <div class="relation">${g.relation}</div>
    </div>
  `).join('');
}

// ── Storage: API with localStorage fallback ────────────────
let useAPI = false; // detected on first load

function localLoad() {
  return {
    messages: JSON.parse(localStorage.getItem('bday_messages') || '[]'),
    photos:   JSON.parse(localStorage.getItem('bday_photos')   || '[]'),
  };
}
function localSaveMessages(msgs)  { localStorage.setItem('bday_messages', JSON.stringify(msgs)); }
function localSavePhotos(photos)  { localStorage.setItem('bday_photos',   JSON.stringify(photos)); }

async function loadAll() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error();
    const data = await res.json();
    useAPI = true;
    renderMessages(data.messages);
    renderGallery(data.photos);
  } catch {
    useAPI = false;
    const data = localLoad();
    renderMessages(data.messages);
    renderGallery(data.photos);
  }
}

// ── Messages ───────────────────────────────────────────────
function renderMessages(messages) {
  const list = document.getElementById('messages-list');
  if (!messages.length) {
    list.innerHTML = '<p class="empty-state">No messages yet — be the first to wish Rustin a happy birthday! 🏎️</p>';
    return;
  }
  list.innerHTML = messages.map(m => `
    <div class="message-card">
      <div class="author">${esc(m.name)}</div>
      <div class="text">${esc(m.message)}</div>
      <div class="time">${formatDate(m.timestamp)}</div>
    </div>
  `).join('');
}

document.getElementById('message-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name    = document.getElementById('msg-name').value.trim();
  const message = document.getElementById('msg-text').value.trim();
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Posting…';
  if (useAPI) {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message })
      });
    } catch { alert('Could not post — please try again.'); }
  } else {
    const data = localLoad();
    data.messages.unshift({ id: Date.now(), name, message, timestamp: new Date().toISOString() });
    localSaveMessages(data.messages);
  }
  document.getElementById('msg-name').value = '';
  document.getElementById('msg-text').value = '';
  await loadAll();
  btn.disabled = false; btn.textContent = 'Post Message 🎈';
});

// ── Gallery ────────────────────────────────────────────────
function renderGallery(photos) {
  const grid = document.getElementById('gallery-grid');
  if (!photos.length) {
    grid.innerHTML = '<p class="empty-state">No photos yet — upload the first memory! 📸</p>';
    return;
  }
  grid.innerHTML = photos.map((p, i) => `
    <div class="gallery-item" data-index="${i}" data-url="${p.url}" data-name="${esc(p.uploaderName)}">
      <img src="${p.url}" alt="Photo by ${esc(p.uploaderName)}" loading="lazy" />
      <div class="caption">📷 ${esc(p.uploaderName)}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.gallery-item').forEach(el => {
    el.addEventListener('click', () => openLightbox(el.dataset.url, el.dataset.name));
  });
}

document.getElementById('photo-file').addEventListener('change', e => {
  document.getElementById('file-label-text').textContent =
    e.target.files[0]?.name || '🖼️ Choose a photo…';
});

document.getElementById('photo-form').addEventListener('submit', e => {
  e.preventDefault();
  const uploaderName = document.getElementById('photo-name').value.trim();
  const file = document.getElementById('photo-file').files[0];
  if (!file) return;
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Uploading…';

  if (useAPI) {
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('uploaderName', uploaderName);
    fetch('/api/photos', { method: 'POST', body: fd })
      .then(() => loadAll())
      .catch(() => alert('Could not upload — please try again.'))
      .finally(() => {
        document.getElementById('photo-name').value = '';
        document.getElementById('photo-file').value = '';
        document.getElementById('file-label-text').textContent = '🖼️ Choose a photo…';
        btn.disabled = false; btn.textContent = 'Upload Photo 📷';
      });
  } else {
    const reader = new FileReader();
    reader.onload = ev => {
      const data = localLoad();
      data.photos.push({ id: Date.now(), url: ev.target.result, uploaderName, timestamp: new Date().toISOString() });
      localSavePhotos(data.photos);
      document.getElementById('photo-name').value = '';
      document.getElementById('photo-file').value = '';
      document.getElementById('file-label-text').textContent = '🖼️ Choose a photo…';
      loadAll();
      btn.disabled = false; btn.textContent = 'Upload Photo 📷';
    };
    reader.readAsDataURL(file);
  }
});

// ── Lightbox ───────────────────────────────────────────────
const lightbox     = document.getElementById('lightbox');
const lightboxImg  = document.getElementById('lightbox-img');
const lightboxName = document.getElementById('lightbox-name');

function openLightbox(url, name) {
  lightboxImg.src    = url;
  lightboxName.textContent = '📷 ' + name;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lightboxImg.src = '';
}

lightbox.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// ── Helpers ────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// ── Login gate ─────────────────────────────────────────────
const CORRECT_USER = 'rustin2026';
const CORRECT_PASS = 'rustinbirthday2026';

const loginGate = document.getElementById('login-gate');

// Stay logged in for the browser session
if (sessionStorage.getItem('bday_auth') === 'yes') {
  loginGate.classList.add('hidden');
}

document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const user = document.getElementById('login-username').value.trim();
  const pass = document.getElementById('login-password').value;
  const err  = document.getElementById('login-error');

  if (user === CORRECT_USER && pass === CORRECT_PASS) {
    sessionStorage.setItem('bday_auth', 'yes');
    loginGate.classList.add('hidden');
    err.textContent = '';
  } else {
    err.textContent = '❌ Wrong username or password — try again!';
    document.getElementById('login-password').value = '';
  }
});

// ── Init ───────────────────────────────────────────────────
renderGuests();
loadAll();
