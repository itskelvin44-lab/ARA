// js/chat.js
// Group chat: load messages, send, file attach, Realtime subscription

// ── RENDER MESSAGES ──
function renderMessages() {
  const msgs = window.S.messages;
  const el = document.getElementById('chat-messages');

  // Remember if user was at the bottom before re-render
  const wasAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;

  if (!msgs || !msgs.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">💬</div><div class="empty-title">No messages yet</div><div class="empty-sub">Be the first to say something to the group!</div></div>';
    return;
  }
  el.innerHTML = msgs.map(m => renderMsg(m)).join('');

  // Scroll to bottom only if we were already at the bottom, or it's the initial load
  if (wasAtBottom || msgs.length <= 5) {
    el.scrollTop = el.scrollHeight;
  }
}

function renderMsg(m) {
  const ismine = m.mine;
  return `<div class="msg-group${ismine ? ' mine' : ''}">
    ${!ismine ? `<div class="msg-av" style="background:${m.color};color:#fff">${m.author.split(' ').map(x => x[0]).join('')}</div>` : ''}
    <div class="msg-col">
      ${!ismine ? `<div class="msg-sender">${m.author}</div>` : ''}
      ${m.text ? `<div class="bubble ${ismine ? 'mine' : 'other'}" ${ismine ? `onclick="editMessage('${m.id}')" title="Click to edit"` : ''}>${escHtml(m.text)}${m.edited ? ' <span style="font-size:10px;opacity:.6">(edited)</span>' : ''}</div>` : ''}
      ${m.file ? `<div class="bubble-attachment"><div class="attach-icon">${m.file.icon}</div><div class="attach-info"><div class="attach-name">${m.file.name}</div><div class="attach-size">${m.file.size}</div></div><button style="margin-left:auto;font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--card);cursor:pointer" onclick="openLink('${m.file.url || '#'}')">↓</button></div>` : ''}
      <div class="msg-time">${m.time}${m.edited ? ' · edited' : ''}</div>
    </div>
    ${ismine ? `<div class="msg-av" style="background:var(--accent);color:#fff">${window.S.user ? window.S.user.initials : 'Me'}</div>` : ''}
  </div>`;
}

// ── LOAD MESSAGES FROM SUPABASE ──
function loadMessages() {
  window.sb
    .from('messages')
    .select('*, profiles(name, color)')
    .order('created_at', { ascending: true })
    .limit(100)
    .then(({ data, error }) => {
      if (error || !data) return;
      window.S.messages = data.map(m => ({
        id: m.id,
        author: m.profiles?.name || 'Member',
        color: m.profiles?.color || '#1a56e8',
        text: m.type === 'text' ? m.content : '',
        type: m.type,
        file: m.type === 'file' ? { name: m.file_name, size: m.file_size, icon: '📎', url: m.file_url } : null,
        time: msgTime(m.created_at),
        edited: m.edited_at ? true : false,
        mine: m.sender_id === window.S.user.id
      }));
      renderMessages();
    });
}

// ── SEND MESSAGE ──
function sendMessage() {
  try {
    const ta = document.getElementById('chat-textarea');
    const text = ta.value.trim();
    if (!text) return;
    ta.value = '';
    updateSendBtn();

    // Show message instantly — no waiting
    window.S.messages.push({
      author: window.S.user.name,
      color: window.S.user.color,
      text: text,
      type: 'text',
      file: null,
      time: msgTime(new Date()),
      mine: true
    });
    renderMessages();

    window.sb.from('messages').insert({
      sender_id: window.S.user.id,
      content: text,
      type: 'text'
    }).then(({ error }) => {
      if (error) {
        console.error('Send failed:', error);
        toast('Message failed to send', 'error');
        loadMessages();
        return;
      }
      // Fallback: if Realtime doesn't fire within 1.5s, fetch
      const msgCount = window.S.messages.length;
      setTimeout(() => {
        if (window.S.messages.length === msgCount) {
          loadMessages();
        }
      }, 1500);
    }).catch(err => {
      console.error('Send error:', err);
      toast('Network error', 'error');
      loadMessages();
    });
  } catch (e) {
    console.error('sendMessage crashed:', e);
  }
}
function subscribeToMessages() {
  window.S.realtimeChannel = window.sb
    .channel('group-chat')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        const m = payload.new;

        // Skip if this message is already in the array (optimistic render)
        const exists = window.S.messages.some(msg =>
          msg.text === m.content &&
          msg.mine &&
          m.sender_id === window.S.user.id
        );
        if (exists) return;

        const { data: profile } = await window.sb
          .from('profiles').select('name, color').eq('id', m.sender_id).single();

        window.S.messages.push({
          id: m.id,
          author: profile?.name || 'Member',
          color: profile?.color || '#1a56e8',
          text: m.type === 'text' ? m.content : '',
          type: m.type,
          file: m.type === 'file' ? { name: m.file_name, size: m.file_size, icon: '📎', url: m.file_url } : null,
          time: msgTime(m.created_at),
          mine: m.sender_id === window.S.user.id
        });
        renderMessages();

        // Browser notification for new messages
        if (document.hidden && m.sender_id !== window.S.user.id && Notification.permission === 'granted') {
          new Notification('ARA Hub — New message', {
            body: (profile?.name || 'Someone') + ': ' + (m.content || 'Sent a file'),
            icon: '/icon-192.png',
            tag: 'chat-message'
          });
        }
      }
    )
        
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages' },
      (payload) => {
        const updated = payload.new;
        const msg = window.S.messages.find(x => x.id === updated.id);
        if (msg) {
          msg.text = updated.content;
          msg.edited = true;
          renderMessages();
        }
      }
    )
    .subscribe();
}
function msgTime(dateStr) {
  const now = new Date();
  const msg = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const msgDay = new Date(msg.getFullYear(), msg.getMonth(), msg.getDate());

  if (msgDay.getTime() === today.getTime()) {
    return msg.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (msgDay.getTime() === yesterday.getTime()) {
    return 'Yesterday ' + msg.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return msg.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function editMessage(id) {
  const msg = window.S.messages.find(x => x.id === id);
  if (!msg || !msg.mine) return;
  const newText = prompt('Edit your message:', msg.text);
  if (!newText || newText === msg.text) return;

  window.sb.from('messages').update({ content: newText, edited_at: new Date().toISOString() }).eq('id', id)
    .then(({ error }) => {
      if (error) { toast('Failed to edit', 'error'); return; }
      msg.text = newText;
      msg.edited = true;
      renderMessages();
    });
}
// ── CHAT INPUT HANDLERS ──
function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}
function updateSendBtn() {
  document.getElementById('send-btn').disabled = !document.getElementById('chat-textarea').value.trim();
}
function formatText(type) {
  const ta = document.getElementById('chat-textarea');
  const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd) || 'text';
  const map = { bold: `**${sel}**`, italic: `_${sel}_`, code: `\`${sel}\``, link: `[${sel}](url)` };
  ta.value += map[type] || sel;
  ta.focus();
  updateSendBtn();
}

// ── FILE ATTACH ──
async function handleFileAttach(input) {
  const files = Array.from(input.files);
  for (const f of files) {
    const path = `${window.S.user.id}/${Date.now()}_${f.name}`;
    const { data: upload, error } = await window.sb.storage
      .from('chat-attachments').upload(path, f);
    if (error) { toast('Upload failed', 'error'); continue; }

    const { data: { publicUrl } } = window.sb.storage
      .from('chat-attachments').getPublicUrl(path);

    const size = f.size > 1048576
      ? (f.size / 1048576).toFixed(1) + ' MB'
      : (f.size / 1024).toFixed(0) + ' KB';

    await window.sb.from('messages').insert({
      sender_id: window.S.user.id,
      type: 'file',
      file_name: f.name,
      file_url: publicUrl,
      file_size: size
    });
  }
  input.value = '';
}
