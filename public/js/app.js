// Shared helpers for all pages.

const fmtMoney = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const fmtDate = (s) => {
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Redirect to the right login page if not authenticated; returns the user object.
// expectedRole ('customer' | 'admin') decides which panel guards the page.
async function requireUser(expectedRole) {
  let user;
  try {
    user = await api('/me');
  } catch {
    location.href = expectedRole === 'admin' ? '/admin-login.html' : '/index.html';
    throw new Error('redirecting');
  }
  const wrongRole = expectedRole === 'admin' ? user.role !== 'admin' : user.role === 'admin';
  if (wrongRole) {
    location.href = user.role === 'admin' ? '/admin.html' : '/dashboard.html';
    throw new Error('redirecting');
  }
  return user;
}

function renderNavbar(user, active) {
  const links = user.role === 'admin'
    ? [['Dashboard', '/admin.html'], ['Transactions', '/admin.html?tab=transactions']]
    : [['Dashboard', '/dashboard.html'], ['Transfer', '/transfer.html'], ['History', '/transactions.html']];
  document.body.insertAdjacentHTML('afterbegin', `
    <nav class="navbar">
      <div class="brand"><span class="logo">B</span> BlueRock Bank</div>
      <div class="nav-right">
        <div class="nav-links">
          ${links.map(([label, href]) => `<a href="${href}" class="${label === active ? 'active' : ''}">${label}</a>`).join('')}
        </div>
        <span class="nav-user">${esc(user.full_name)}</span>
        <button class="btn-logout" id="logoutBtn">Logout</button>
      </div>
    </nav>`);
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/logout', { method: 'POST' });
    location.href = '/index.html';
  });
}

function msg(el, text, type) {
  el.textContent = text;
  el.className = 'msg ' + type;
  el.classList.remove('hidden');
}
