// js/notes.js
// Project notes: load resources, add links, upload files

// ── RENDER NOTES ──
function renderNotes() {
  const el = document.getElementById('notes-list');
  const notes = window.S.notes;
  if (!notes || !notes.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📚</div><div class="empty-title">No resources yet</div><div class="empty-sub">Upload files or add links to papers, books, and documents.</div></div>';
    return;
  }
  const typeLabels = { paper: 'Paper', book: 'Book', doc: 'Document', link: 'Link', other: 'Resource' };
  el.innerHTML = notes.map(n => `
    <div class="notice-full-card">
      <div class="notice-head">
        <div class="notice-author">
          <div style="font-size:24px;flex-shrink:0">${n.icon}</div>
          <div>
            <div class="notice-full-title" style="margin-bottom:2px">${escHtml(n.title)}</div>
            <div class="text-xs text-muted font-mono">${typeLabels[n.type] || 'Resource'} · added by ${n.author} · ${n.time}</div>
          </div>
        </div>
      </div>
      <div class="notice-full-body">${escHtml(n.desc)}</div>
      <div class="notice-actions">
        ${n.desc && n.desc.startsWith('http') ? `<button class="react-btn" onclick="openLink('${n.desc.split(' ')[0]}')">🔗 Open Link</button>` : ''}
        <button class="react-btn" onclick="toast('Resource saved to your library')">⭐ Save</button>
                <button class="react-btn" onclick="replyNote('${n.id}')">💬 Discuss in Chat</button>
        ${n.author_id === window.S.user.id ? `<button class="react-btn" onclick="deleteNote('${n.id}')" style="color:var(--red)">🗑 Delete</button>` : ''}
      </div>
    </div>
  `).join('');
}

// ── LOAD NOTES FROM SUPABASE ──
function loadNotes() {
  window.sb
    .from('resources')
    .select('*, profiles(name)')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => {
      if (error || !data) return;
      const icons = { paper: '📄', book: '📖', doc: '📝', link: '🔗', other: '📦' };
      window.S.notes = data.map(r => ({
        id: r.id,
        author_id: r.author_id,
        title: r.title,
        type: r.type,
        desc: r.description,
        icon: icons[r.type] || '📦',
        author: r.profiles?.name || 'Member',
        time: timeAgo(r.created_at)
      }));
      renderNotes();
    });
}

// ── ADD A RESOURCE ──
function addNote() {
  const t = document.getElementById('note-title').value.trim();
  const d = document.getElementById('note-desc').value.trim();
  if (!t || !d) { toast('Please fill in title and description/link', 'error'); return; }
  const type = document.getElementById('note-type').value;

  window.sb.from('resources').insert({
    title: t,
    type: type,
    description: d,
    author_id: window.S.user.id
  }).then(({ error }) => {
    if (error) { toast('Could not save resource', 'error'); return; }
    document.getElementById('note-title').value = '';
    document.getElementById('note-desc').value = '';
    toast('Resource added!', 'success');
    loadNotes();
  });
}

// ── REPLY NOTE (DISCUSS IN CHAT) ──
function replyNote(id) {
  const n = window.S.notes.find(x => x.id === id);
  navTo('chat', null);
  setTimeout(() => {
    document.getElementById('chat-textarea').value = n ? `Re: "${n.title}" — ` : '';
    document.getElementById('chat-textarea').focus();
    updateSendBtn();
  }, 100);
}

// ── RENDER NOTE FILES ──
function renderNoteFiles() {
  const el = document.getElementById('notes-files-list');
  if (!el) return;
  const files = window.S.noteFiles;
  if (!files || !files.length) {
    el.innerHTML = '<div class="text-xs text-muted" style="padding:8px 0">No files uploaded yet. Click the upload area above.</div>';
    return;
  }
  el.innerHTML = files.map(f => `
    <div class="notes-file-item">
      <div class="notes-file-icon">${f.icon}</div>
      <div class="notes-file-info">
        <div class="notes-file-name">${escHtml(f.name)}</div>
        <div class="notes-file-meta">${f.size} · uploaded by ${f.author} · ${f.time}</div>
      </div>
      <div class="notes-file-actions">
                <button class="download-btn" onclick="openLink('${f.url}')">⬇ Download</button>
        <button class="download-btn" onclick="deleteFile('${f.id}')" style="color:var(--red);border-color:var(--red)">🗑</button>
      </div>
    </div>
  `).join('');
}

// ── LOAD NOTE FILES FROM SUPABASE ──
function loadNoteFiles() {
  window.sb
    .from('uploads')
    .select('*, profiles(name)')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => {
      if (error || !data) return;
      window.S.noteFiles = data.map(u => {
        const ext = u.file_name.split('.').pop().toLowerCase();
        const iconMap = {
          pdf: '📄', doc: '📝', docx: '📝', pptx: '📊',
          jpg: '🖼', jpeg: '🖼', png: '🖼', py: '💻',
          js: '💻', sql: '🗄', json: '📋', zip: '🗜'
        };
        return {
          id: u.id,
          name: u.file_name,
          size: u.file_size,
          icon: iconMap[ext] || '📦',
          url: u.file_url,
          author: u.profiles?.name || 'Member',
          time: timeAgo(u.created_at)
        };
      });
      renderNoteFiles();
    });
}

// ── UPLOAD NOTE FILE ──
async function uploadNoteFile(input) {
  const files = Array.from(input.files);
  for (const f of files) {
    const path = `${window.S.user.id}/${Date.now()}_${f.name}`;
    const { error: upErr } = await window.sb.storage
      .from('project-uploads').upload(path, f);
    if (upErr) { toast('Upload failed', 'error'); continue; }

    const { data: { publicUrl } } = window.sb.storage
      .from('project-uploads').getPublicUrl(path);

    const size = f.size > 1048576
      ? (f.size / 1048576).toFixed(1) + ' MB'
      : (f.size / 1024).toFixed(0) + ' KB';

    await window.sb.from('uploads').insert({
      uploaded_by: window.S.user.id,
      file_name: f.name,
      file_url: publicUrl,
      file_size: size
    });
  }
  input.value = '';
  loadNoteFiles();
  toast(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`, 'success');
}
// ── DELETE A RESOURCE ──
function deleteNote(id) {
  if (!confirm('Delete this resource? This cannot be undone.')) return;
  window.sb.from('resources').delete().eq('id', id).then(({ error }) => {
    if (error) { toast('Failed to delete', 'error'); return; }
    toast('Resource deleted', 'success');
    loadNotes();
  });
}
// ── DELETE AN UPLOADED FILE ──
function deleteFile(id) {
  if (!confirm('Delete this file? This cannot be undone.')) return;
  window.sb.from('uploads').delete().eq('id', id).then(({ error }) => {
    if (error) { toast('Failed to delete', 'error'); return; }
    toast('File deleted', 'success');
    loadNoteFiles();
  });
}