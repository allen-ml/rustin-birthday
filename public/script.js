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
let useAPI = false;

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
    renderAlbums(data.photos);
  } catch {
    useAPI = false;
    const data = localLoad();
    renderMessages(data.messages);
    renderAlbums(data.photos);
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

// ── Albums (grouped by uploader) ───────────────────────────
function groupByUploader(photos) {
  const map = {};
  photos.forEach(p => {
    const name = p.uploaderName || 'A friend';
    if (!map[name]) map[name] = [];
    map[name].push(p);
  });
  return map;
}

function renderAlbums(photos) {
  const grid = document.getElementById('albums-grid');
  const albums = groupByUploader(photos);
  const names  = Object.keys(albums);

  if (!names.length) {
    grid.innerHTML = '<p class="empty-state">No photos yet — be the first to upload! 📸</p>';
    return;
  }

  grid.innerHTML = names.map(name => {
    const pics  = albums[name];
    const cover = pics[0].url;
    const count = pics.length;
    return `
      <div class="album-card" data-name="${esc(name)}">
        <div class="album-cover" style="background-image:url('${cover}')">
          <div class="album-overlay"></div>
        </div>
        <div class="album-info">
          <span class="album-name">${esc(name)}</span>
          <span class="album-count">${count} photo${count > 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.album-card').forEach(el => {
    el.addEventListener('click', () => openFolder(el.dataset.name, albums[el.dataset.name]));
  });
}

// ── Multi-file upload ──────────────────────────────────────
document.getElementById('photo-file').addEventListener('change', e => {
  const files = e.target.files;
  const label = document.getElementById('file-label-text');
  if (!files.length) { label.textContent = '🖼️ Choose photos… (select multiple!)'; return; }
  label.textContent = files.length === 1
    ? `🖼️ ${files[0].name}`
    : `🖼️ ${files.length} photos selected`;
});

document.getElementById('photo-form').addEventListener('submit', async e => {
  e.preventDefault();
  const uploaderName = document.getElementById('photo-name').value.trim();
  const files        = Array.from(document.getElementById('photo-file').files);
  if (!files.length) return;

  const btn      = e.target.querySelector('button');
  const progress = document.getElementById('upload-progress');
  const bar      = document.getElementById('upload-bar');
  const status   = document.getElementById('upload-status');

  btn.disabled = true;
  progress.style.display = 'flex';

  if (useAPI) {
    // Upload files one by one, showing progress
    for (let i = 0; i < files.length; i++) {
      status.textContent = `Uploading ${i + 1} of ${files.length}…`;
      bar.style.width = `${Math.round((i / files.length) * 100)}%`;
      const fd = new FormData();
      fd.append('photo', files[i]);
      fd.append('uploaderName', uploaderName);
      try { await fetch('/api/photos', { method: 'POST', body: fd }); }
      catch { /* continue */ }
    }
    bar.style.width = '100%';
    status.textContent = 'Done!';
  } else {
    // localStorage: read all as base64
    const existing = localLoad();
    let done = 0;
    await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => {
        existing.photos.push({
          id: Date.now() + Math.random(),
          url: ev.target.result,
          uploaderName,
          timestamp: new Date().toISOString()
        });
        done++;
        bar.style.width = `${Math.round((done / files.length) * 100)}%`;
        status.textContent = `Processing ${done} of ${files.length}…`;
        resolve();
      };
      reader.readAsDataURL(file);
    })));
    localSavePhotos(existing.photos);
    bar.style.width = '100%';
    status.textContent = 'Done!';
  }

  setTimeout(() => { progress.style.display = 'none'; bar.style.width = '0%'; }, 800);
  document.getElementById('photo-name').value = '';
  document.getElementById('photo-file').value = '';
  document.getElementById('file-label-text').textContent = '🖼️ Choose photos… (select multiple!)';
  btn.disabled = false;
  btn.textContent = 'Upload Photos 📷';
  await loadAll();
});

// ── Folder modal ───────────────────────────────────────────
const folderModal = document.getElementById('folder-modal');
const folderStrip = document.getElementById('folder-strip');
const folderTitle = document.getElementById('folder-title');
let folderPhotos  = [];

function openFolder(name, photos) {
  folderPhotos = photos;
  folderTitle.textContent = `📁 ${name}'s Photos (${photos.length})`;
  folderStrip.innerHTML = photos.map((p, i) => `
    <div class="folder-thumb" data-index="${i}">
      <img src="${p.url}" alt="photo ${i+1}" loading="lazy" />
    </div>
  `).join('');
  folderStrip.querySelectorAll('.folder-thumb').forEach(el => {
    el.addEventListener('click', () => openLightbox(folderPhotos, parseInt(el.dataset.index)));
  });
  folderModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFolder() {
  folderModal.classList.remove('open');
  if (!lightbox.classList.contains('open')) document.body.style.overflow = '';
}

document.getElementById('folder-close').addEventListener('click', closeFolder);
folderModal.addEventListener('click', e => { if (e.target === folderModal) closeFolder(); });

// Scroll strip with arrow buttons
document.getElementById('folder-prev').addEventListener('click', () => {
  folderStrip.parentElement.scrollBy({ left: -300, behavior: 'smooth' });
});
document.getElementById('folder-next').addEventListener('click', () => {
  folderStrip.parentElement.scrollBy({ left: 300, behavior: 'smooth' });
});

// ── Lightbox with arrow navigation ────────────────────────
const lightbox    = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxName= document.getElementById('lightbox-name');
const lbCounter   = document.getElementById('lightbox-counter');
let lbPhotos = [];
let lbIndex  = 0;

function openLightbox(photos, index) {
  lbPhotos = photos;
  lbIndex  = index;
  showLbPhoto();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function showLbPhoto() {
  const p = lbPhotos[lbIndex];
  lightboxImg.src          = p.url;
  lightboxName.textContent = '📷 ' + (p.uploaderName || '');
  lbCounter.textContent    = `${lbIndex + 1} / ${lbPhotos.length}`;
  // dim arrows at edges
  document.getElementById('lb-prev').style.opacity = lbIndex === 0 ? '.3' : '1';
  document.getElementById('lb-next').style.opacity = lbIndex === lbPhotos.length - 1 ? '.3' : '1';
}

function lbMove(dir) {
  const next = lbIndex + dir;
  if (next < 0 || next >= lbPhotos.length) return;
  lbIndex = next;
  showLbPhoto();
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightboxImg.src = '';
  if (!folderModal.classList.contains('open')) document.body.style.overflow = '';
}

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lb-prev').addEventListener('click', () => lbMove(-1));
document.getElementById('lb-next').addEventListener('click', () => lbMove(1));
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', e => {
  if (lightbox.classList.contains('open')) {
    if (e.key === 'ArrowLeft')  lbMove(-1);
    if (e.key === 'ArrowRight') lbMove(1);
    if (e.key === 'Escape')     closeLightbox();
  } else if (folderModal.classList.contains('open')) {
    if (e.key === 'ArrowLeft')  folderStrip.parentElement.scrollBy({ left: -300, behavior: 'smooth' });
    if (e.key === 'ArrowRight') folderStrip.parentElement.scrollBy({ left:  300, behavior: 'smooth' });
    if (e.key === 'Escape')     closeFolder();
  }
});

// ── Login gate ─────────────────────────────────────────────
const CORRECT_USER = 'rustin2026';
const CORRECT_PASS = 'rustinbirthday2026';
const loginGate    = document.getElementById('login-gate');

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

// ── Init ───────────────────────────────────────────────────
renderGuests();
loadAll();
