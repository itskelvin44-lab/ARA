// js/members.js
// Member directory: load, filter, render, presence

// ── RENDER MEMBERS ──
function renderMembers(list) {
  const el = document.getElementById('members-grid');
  if (!list || !list.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">👥</div><div class="empty-title">No members yet</div><div class="empty-sub">Members will appear here as people join the workspace.</div></div>';
    return;
  }
  el.innerHTML = list.map(m => `
    <div class="member-card" onclick="showMember('${m.id}')">
      <div class="member-av" style="background:${m.color}15;color:${m.color}">
        ${m.name.split(' ').map(x => x[0]).join('')}
        ${m.online ? '<span class="online-dot"></span>' : ''}
      </div>
      <div class="member-name">${m.name}</div>
      <div class="member-role">${m.role}</div>
      <div class="member-tags">${(m.skills || []).slice(0, 3).map(s => `<span class="tag">${s}</span>`).join('')}</div>
      <div class="member-stats">
        <div class="mstat"><div class="mstat-num">${m.msgs || 0}</div><div class="mstat-label">msgs</div></div>
        <div class="mstat"><div class="mstat-num">${m.notes || 0}</div><div class="mstat-label">notes</div></div>
      </div>
    </div>
  `).join('');
}

// ── LOAD MEMBERS FROM SUPABASE ──
function loadMembers() {
  window.sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
    .then(({ data, error }) => {
      if (error || !data) return;
      window.S.members = data.map(p => ({
        id:     p.id,
        name:   p.name,
        role:   p.role || 'Contributor',
        email:  '',
        skills: p.skills || [],
        bio:    p.bio || '',
        color:  p.color || '#1a56e8',
        online: false,
        msgs:   0,
        notes:  0
      }));
      renderMembers(window.S.members);
    });
}

// ── FILTER MEMBERS ──
function filterMembers(q) {
  const filtered = window.S.members.filter(m =>
    m.name.toLowerCase().includes(q.toLowerCase()) ||
    (m.skills || []).some(s => s.toLowerCase().includes(q.toLowerCase()))
  );
  renderMembers(filtered);
}

function filterByRole(role) {
  const filtered = role ? window.S.members.filter(m => m.role === role) : window.S.members;
  renderMembers(filtered);
}

// ── SHOW MEMBER DETAIL ──
function showMember(id) {
  const m = window.S.members.find(x => x.id === id);
  if (!m) return;
  window.S.currentMember = m;
  document.getElementById('mm-title').textContent = m.name;
  document.getElementById('mm-body').innerHTML = `
    <div class="flex items-center gap-3 mb-3">
      <div style="width:52px;height:52px;border-radius:50%;background:${m.color}20;color:${m.color};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0;position:relative">
        ${m.name.split(' ').map(x => x[0]).join('')}
        ${m.online ? '<span class="online-dot"></span>' : ''}
      </div>
      <div>
        <div class="fw-600" style="font-size:16px">${m.name}</div>
        <div class="text-sm text-muted">${m.role} · ${m.online ? '🟢 Online' : '⚫ Offline'}</div>
      </div>
    </div>
    <div class="text-sm" style="margin-bottom:14px;line-height:1.65">${m.bio || 'No bio yet.'}</div>
    <div style="margin-bottom:14px">
      <div class="text-xs text-muted font-mono" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Skills</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${(m.skills || []).map(s => `<span class="tag">${s}</span>`).join('') || '<span class="text-xs text-muted">No skills listed</span>'}</div>
    </div>
    <div style="display:flex;gap:16px;padding-top:12px;border-top:1px solid var(--border)">
      <div class="mstat"><div class="mstat-num">${m.msgs || 0}</div><div class="mstat-label">messages</div></div>
      <div class="mstat"><div class="mstat-num">${m.notes || 0}</div><div class="mstat-label">notes</div></div>
      <div class="mstat"><div class="mstat-num">${m.online ? 'Now' : '—'}</div><div class="mstat-label">status</div></div>
    </div>
  `;
  openModal('member-modal');
}

// ── DM MEMBER ──
function dmMember() {
  if (!window.S.currentMember) return;
  closeModal('member-modal');
  navTo('chat', null);
  setTimeout(() => {
    document.getElementById('chat-textarea').value = `@${window.S.currentMember.name.split(' ')[0]} `;
    document.getElementById('chat-textarea').focus();
    updateSendBtn();
  }, 100);
}

// ── PRESENCE (ONLINE STATUS) ──
function subscribeToPresence() {
  const presenceChannel = window.sb.channel('online-users');

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const onlineIds = Object.values(state).flat().map(p => p.user_id);
      window.S.members = window.S.members.map(m => ({
        ...m,
        online: onlineIds.includes(m.id)
      }));
      renderMembers(window.S.members);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: window.S.user.id,
          name:    window.S.user.name,
          online_at: new Date().toISOString()
        });
      }
    });
}
