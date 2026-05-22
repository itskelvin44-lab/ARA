// js/app.js
// Central state, navigation, modals, toasts, utilities, initApp

// ── GLOBAL STATE ──
window.S = {
  user: null,
  currentMember: null,
  messages: [],
  notices: [],
  members: [],
  notes: [],
  noteFiles: [],
  typingTimer: null,
  realtimeChannel: null
};

// ── NAVIGATION ──
function navTo(panel, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(panel + '-panel').classList.add('active');
  if (el) el.classList.add('active');
  else {
    document.querySelectorAll('.nav-item').forEach(n => {
      const txt = n.textContent.toLowerCase();
      if (panel === 'welcome' && txt.includes('welcome')) n.classList.add('active');
      if (panel === 'dash' && txt.includes('dashboard')) n.classList.add('active');
      if (panel === 'chat' && txt.includes('chat')) n.classList.add('active');
      if (panel === 'notices' && txt.includes('notice')) n.classList.add('active');
      if (panel === 'members' && txt.includes('member')) n.classList.add('active');
      if (panel === 'repo' && txt.includes('repository')) n.classList.add('active');
      if (panel === 'notes' && txt.includes('project notes')) n.classList.add('active');
    });
  }
  const titles = {
    welcome: { t: 'Welcome', s: 'About this project' },
    dash: { t: 'Dashboard', s: 'Good to have you back' },
    chat: { t: 'Group Chat', s: 'All members in one place' },
    notices: { t: 'Notice Board', s: 'Announcements & updates' },
    members: { t: 'Members', s: 'The ARA Collective' },
    repo: { t: 'Repository', s: 'Codebase & contribution guide' },
    notes: { t: 'Project Notes', s: 'Documents, papers & resources' }
  };
  const info = titles[panel] || { t: panel, s: '' };
  document.getElementById('topbar-title').innerHTML = `<div class="topbar-title">${info.t}</div><div class="topbar-sub">${info.s}</div>`;
  closeSidebar();
  if (panel === 'dash') renderPinnedNotices();
  if (panel === 'welcome') setTimeout(triggerReveal, 30);
}

// ── SIDEBAR MOBILE ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay-bg').style.display =
    document.getElementById('sidebar').classList.contains('open') ? 'block' : 'none';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay-bg').style.display = 'none';
}

// ── MODALS ──
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.overlay.show').forEach(m => m.classList.remove('show'));
});

// ── TOAST ──
function toast(msg, type) {
  const c = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.innerHTML = `${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── UTILS ──
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function openLink(url) { window.open(url, '_blank', 'noopener,noreferrer'); }

// ── SCROLL REVEAL ──
function triggerReveal() {
  const panel = document.getElementById('welcome-panel');
  if (panel) {
    panel.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.transitionDelay = (i * 0.07) + 's';
      setTimeout(() => el.classList.add('visible'), 50);
    });
  }
}

// ── ACTIVITY FEED ──
function renderActivity() {
  const el = document.getElementById('activity-feed');
  el.innerHTML = '<div class="text-sm text-muted" style="padding:12px">Activity will appear here as the team collaborates.</div>';
}

// ── PROFILE ──
function showProfile() { openModal('profile-modal'); }
function saveProfile() {
  const name = document.getElementById('profile-name').value.trim();
  const role = document.getElementById('profile-role').value.trim();
  if (!name) return;

  window.sb.from('profiles').update({ name, role }).eq('id', window.S.user.id)
    .then(({ error }) => {
      if (error) {
        toast('Failed to save profile', 'error');
        return;
      }
      window.S.user.name = name;
      window.S.user.role = role;
      window.S.user.initials = name.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase();
      document.getElementById('user-av').textContent = window.S.user.initials;
      document.getElementById('user-name').textContent = window.S.user.name;
      document.getElementById('user-role').textContent = window.S.user.role;
      document.getElementById('modal-av').textContent = window.S.user.initials;
      document.getElementById('modal-name').textContent = window.S.user.name;
      closeModal('profile-modal');
      toast('Profile saved!', 'success');
    });
}

// ── INIT APP ──
function initApp() {
  // Render empty states immediately
  renderMessages();
  renderActivity();
  renderNotices();
  renderPinnedNotices();
  renderMembers([]);
  renderNotes();
  renderNoteFiles();

  // Fetch real data from Supabase
  if (typeof loadMessages === 'function') loadMessages();
  if (typeof loadNotices === 'function') loadNotices();
  if (typeof loadMembers === 'function') loadMembers();
  if (typeof loadNotes === 'function') loadNotes();
  if (typeof loadNoteFiles === 'function') loadNoteFiles();
  if (typeof subscribeToMessages === 'function') subscribeToMessages();
  if (typeof subscribeToPresence === 'function') subscribeToPresence();
}
