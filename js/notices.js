// js/notices.js
// Notice board: load, post, react (like/pin), render

// ── RENDER NOTICES ──
function renderNotices() {
  const el = document.getElementById('notices-list');
  const notices = window.S.notices;
  if (!notices || !notices.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No notices yet</div><div class="empty-sub">Post the first announcement to the team!</div></div>';
    renderPinnedNotices();
    return;
  }
  const catMap = {
    urgent: { label: 'Urgent', cls: 'tag-urgent' },
    info: { label: 'Info', cls: 'tag-info' },
    update: { label: 'Update', cls: 'tag-update' },
    question: { label: 'Question', cls: 'tag-info' },
    idea: { label: 'Idea', cls: 'tag-update' }
  };
  el.innerHTML = notices.map(n => {
    const c = catMap[n.cat] || catMap.info;
    return `<div class="notice-full-card">
      <div class="notice-head">
        <div class="notice-author">
          <div class="notice-author-av" style="background:${n.color};color:#fff">${n.author.split(' ').map(x => x[0]).join('')}</div>
          <div>
            <div class="notice-author-name">${n.author}</div>
            <div class="text-xs text-muted font-mono">${n.time}</div>
          </div>
        </div>
        <span class="notice-tag ${c.cls}">${c.label}</span>
      </div>
      <div class="notice-full-title">${escHtml(n.title)}</div>
      <div class="notice-full-body">${escHtml(n.body)}</div>
      <div class="notice-actions">
        <button class="react-btn${n._liked ? ' active' : ''}" onclick="reactNotice('${n.id}','like',this)">👍 ${n.likes}</button>
        <button class="react-btn${n._pinned ? ' active' : ''}" onclick="reactNotice('${n.id}','pin',this)">📌 ${n.pins}</button>
              <button class="react-btn" onclick="replyNotice('${n.id}')">💬 Reply</button>
        ${n.author_id === window.S.user.id ? `<button class="react-btn" onclick="deleteNotice('${n.id}')" style="color:var(--red)">🗑 Delete</button>` : ''}
      </div>
    </div>`;
  }).join('');
  renderPinnedNotices();
}

// ── RENDER PINNED NOTICES (DASHBOARD) ──
function renderPinnedNotices() {
  const el = document.getElementById('pinned-notices');
  if (!el) return;
  const notices = window.S.notices || [];
  const urgent = notices.filter(n => n.cat === 'urgent');
  const pinned = notices.filter(n => n.pins > 0 && n.cat !== 'urgent');
  const recent = notices.filter(n => n.pins === 0 && n.cat !== 'urgent');
  const display = [...urgent, ...pinned, ...recent].slice(0, 4);
  if (!display.length) {
    el.innerHTML = '<div class="text-sm text-muted" style="padding:12px 0">No notices yet. Post one from the Notice Board.</div>';
    return;
  }
  const tagMap = {
    urgent: { label: 'Urgent', cls: 'tag-urgent' },
    info: { label: 'Info', cls: 'tag-info' },
    update: { label: 'Update', cls: 'tag-update' },
    question: { label: 'Question', cls: 'tag-info' },
    idea: { label: 'Idea', cls: 'tag-update' }
  };
  el.innerHTML = display.map(n => {
    const c = tagMap[n.cat] || tagMap.info;
    return `<div class="notice-item" style="cursor:pointer" onclick="navTo('notices',null)">
      <span class="notice-tag ${c.cls}">${c.label}</span>
      <div class="notice-title">${escHtml(n.title)}</div>
      <div class="notice-body">${escHtml(n.body)}</div>
      <div class="notice-meta">Posted by ${n.author} · ${n.time}</div>
    </div>`;
  }).join('');
}

// ── LOAD NOTICES FROM SUPABASE ──
function loadNotices() {
  window.sb
    .from('notices')
    .select('*, profiles(name, color), notice_reactions(type, user_id)')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => {
      if (error || !data) return;
      window.S.notices = data.map(n => ({
        id: n.id,
        author_id: n.author_id,
        title: n.title,
        body: n.body,
        cat: n.category,
        author: n.profiles?.name || 'Member',
        color: n.profiles?.color || '#1a56e8',
        time: timeAgo(n.created_at),
        likes: n.notice_reactions.filter(r => r.type === 'like').length,
        pins: n.notice_reactions.filter(r => r.type === 'pin').length,
        _liked: n.notice_reactions.some(r => r.type === 'like' && r.user_id === window.S.user.id),
        _pinned: n.notice_reactions.some(r => r.type === 'pin' && r.user_id === window.S.user.id)
      }));
      renderNotices();
    });
}

// ── POST A NOTICE ──
function postNotice() {
  const t = document.getElementById('notice-title').value.trim();
  const b = document.getElementById('notice-body').value.trim();
  if (!t || !b) { toast('Please fill in title and message', 'error'); return; }
  const cat = document.getElementById('notice-cat').value;

  window.sb.from('notices').insert({
    title: t,
    body: b,
    category: cat,
    author_id: window.S.user.id
  }).then(({ error }) => {
    if (error) { toast('Could not post notice', 'error'); return; }
    document.getElementById('notice-title').value = '';
    document.getElementById('notice-body').value = '';
    toast('Notice posted!', 'success');
    loadNotices();
  });
}

// ── REACT TO A NOTICE (LIKE / PIN) ──
function reactNotice(id, type, btn) {
  const n = window.S.notices.find(x => x.id === id);
  if (!n) return;
  const already = type === 'like' ? n._liked : n._pinned;

  if (already) {
    window.sb.from('notice_reactions')
      .delete()
      .eq('notice_id', id)
      .eq('user_id', window.S.user.id)
      .eq('type', type)
      .then(() => loadNotices());
  } else {
    window.sb.from('notice_reactions')
      .insert({ notice_id: id, user_id: window.S.user.id, type })
      .then(() => loadNotices());
  }
}

// ── REPLY TO NOTICE ──
function replyNotice(id) {
  navTo('chat', null);
  setTimeout(() => {
    document.getElementById('chat-textarea').value = 'Re: notice — ';
    document.getElementById('chat-textarea').focus();
    updateSendBtn();
  }, 100);
}

// ── SHOW NEW POST ──
function showNewPost() {
  navTo('notices', null);
  setTimeout(() => document.getElementById('notice-title').focus(), 100);
}
// ── DELETE A NOTICE ──
function deleteNotice(id) {
  if (!confirm('Delete this notice? This cannot be undone.')) return;
  window.sb.from('notices').delete().eq('id', id).then(({ error }) => {
    if (error) { toast('Failed to delete', 'error'); return; }
    toast('Notice deleted', 'success');
    loadNotices();
  });
}
// ── TIME AGO HELPER ──
function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return then.toLocaleDateString();
}
