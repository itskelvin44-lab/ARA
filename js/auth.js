// js/auth.js
// Google OAuth, session handling, onboarding, profile save

// Onboarding state
const OB = { color: '#1a56e8', skills: [] };

// ── Sign in with Google ──
function signIn() {
  window.sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
}

// ── Sign out ──
function signOut() {
  window.sb.auth.signOut().then(() => {
    window.S.user = null;
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
    toast('Signed out successfully');
  });
}

// ── Handle auth callback on page load ──
function handleAuthCallback() {
  window.sb.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
      document.getElementById('auth-screen').style.display = 'flex';
      return;
    }

    const u = session.user;

    window.sb.from('profiles').select('*').eq('id', u.id).single()
      .then(({ data: profile, error }) => {
        if (!profile || !profile.onboarding_complete) {
          // First time — show onboarding
          window.S.user = {
            id:       u.id,
            name:     u.user_metadata?.full_name || u.email.split('@')[0],
            email:    u.email,
            color:    '#1a56e8',
            initials: (u.user_metadata?.full_name || 'U').split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase()
          };
          document.getElementById('auth-screen').style.display = 'none';
          document.getElementById('onboarding-screen').style.display = 'flex';
          document.getElementById('ob-name').value = window.S.user.name;
          OB.color = '#1a56e8';
          OB.skills = [];
          obUpdatePreview();
          obRenderChips();
        } else {
          // Returning user
          window.S.user = {
            id:       u.id,
            name:     profile.name,
            role:     profile.role,
            email:    u.email,
            bio:      profile.bio,
            skills:   profile.skills || [],
            color:    profile.color,
            initials: profile.name.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase()
          };
          document.getElementById('auth-screen').style.display = 'none';
          launchApp();
          toast('Welcome back, ' + profile.name.split(' ')[0] + '! 👋');
        }
      });
  });
}

// ── Onboarding: update avatar preview ──
function obUpdatePreview() {
  const name = document.getElementById('ob-name').value.trim();
  const initials = name ? name.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase() : '?';
  const av = document.getElementById('ob-avatar-preview');
  av.textContent = initials;
  av.style.background = OB.color;
}

// ── Onboarding: pick colour ──
function obPickColor(el) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  OB.color = el.dataset.color;
  obUpdatePreview();
}

// ── Onboarding: skill key handler ──
function obSkillKey(e) {
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); obAddSkill(); }
}

// ── Onboarding: add skill ──
function obAddSkill() {
  const inp = document.getElementById('ob-skill-input');
  const val = inp.value.trim().replace(/,$/, '');
  if (!val || OB.skills.includes(val) || OB.skills.length >= 10) { inp.value = ''; return; }
  OB.skills.push(val);
  inp.value = '';
  obRenderChips();
}

// ── Onboarding: remove skill ──
function obRemoveSkill(skill) {
  OB.skills = OB.skills.filter(s => s !== skill);
  obRenderChips();
}

// ── Onboarding: render skill chips ──
function obRenderChips() {
  document.getElementById('ob-skills-chips').innerHTML = OB.skills.map(s =>
    `<span class="skill-chip">${escHtml(s)}<button onclick="obRemoveSkill('${escHtml(s)}')" title="Remove">×</button></span>`
  ).join('');
}

// ── Onboarding: finish ──
function obFinish() {
  const name = document.getElementById('ob-name').value.trim();
  if (!name) { document.getElementById('ob-name').focus(); document.getElementById('ob-name').style.borderColor = 'var(--red)'; return; }
  const role = document.getElementById('ob-role').value || 'Contributor';
  const bio = document.getElementById('ob-bio').value.trim();

  const profileData = {
    id:                  window.S.user.id,
    name:                name,
    role:                role,
    bio:                 bio,
    skills:              OB.skills,
    color:               OB.color,
    onboarding_complete: true
  };

  window.sb.from('profiles').upsert(profileData).then(({ error }) => {
    if (error) { toast('Could not save profile', 'error'); return; }
    window.S.user = { ...window.S.user, ...profileData,
      initials: name.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase()
    };
    document.getElementById('onboarding-screen').style.display = 'none';
    launchApp();
    toast('Profile saved! Welcome to ARA Hub, ' + name.split(' ')[0] + ' 🎉', 'success');
  });
}

// ── Onboarding: skip ──
function obSkip() {
  const name = window.S.user.name || 'Member';
  window.sb.from('profiles').upsert({
    id:   window.S.user.id,
    name: name,
    role: 'Contributor',
    color: '#1a56e8'
  }).then(() => {
    document.getElementById('onboarding-screen').style.display = 'none';
    launchApp();
    toast('Welcome! Set up your profile anytime via the sidebar.');
  });
}

// ── Launch the main app ──
function launchApp() {
  document.getElementById('main-app').style.display = 'flex';
  document.getElementById('user-av').textContent = window.S.user.initials;
  document.getElementById('user-av').style.background = window.S.user.color || 'var(--accent)';
  document.getElementById('user-name').textContent = window.S.user.name;
  document.getElementById('user-role').textContent = window.S.user.role;
  document.getElementById('modal-av').textContent = window.S.user.initials;
  document.getElementById('modal-name').textContent = window.S.user.name;
  document.getElementById('modal-email').textContent = window.S.user.email;
  document.getElementById('profile-name').value = window.S.user.name;
  document.getElementById('profile-role').value = window.S.user.role;
  initApp();
  navTo('welcome', null);
  setTimeout(triggerReveal, 80);
}

// ── Run on page load ──
document.addEventListener('DOMContentLoaded', handleAuthCallback);
