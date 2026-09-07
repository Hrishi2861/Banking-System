const path = require('path');
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { verifyPassword, genAccountNumber, findUserByUsername, getUserById, transferMoney } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'banking-system-demo-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
  })
);

// Login endpoints are exposed on a public IP, so throttle brute-force
// attempts: 10 tries per IP per 15 minutes (see UPDATES.md deployment notes).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' }
});
app.use('/api/login', loginLimiter);
app.use('/api/admin/login', loginLimiter);

// ---------- helpers ----------

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function ownAccount(req, res, accountId) {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return null;
  }
  if (account.user_id !== req.session.userId) {
    res.status(403).json({ error: 'Not your account' });
    return null;
  }
  return account;
}

const api = express.Router();
app.use('/api', api);

// ---------- auth ----------

// Shared login logic for both panels. `expectedRole` keeps each panel
// restricted to its own user type.
function handleLogin(req, res, expectedRole) {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = findUserByUsername(String(username).trim());
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  if (user.role !== expectedRole) {
    const hint = expectedRole === 'admin'
      ? 'This is the admin panel. Customer accounts must sign in at the customer portal.'
      : 'Admin accounts must sign in at the admin panel.';
    return res.status(403).json({ error: `This account cannot sign in here. ${hint}` });
  }

  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ id: user.id, username: user.username, full_name: user.full_name, role: user.role });
}

api.post('/login', (req, res) => handleLogin(req, res, 'customer'));
api.post('/admin/login', (req, res) => handleLogin(req, res, 'admin'));

api.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

api.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  res.json(user);
});

// ---------- customer: accounts & transactions ----------

api.get('/accounts', requireLogin, (req, res) => {
  const accounts = db.prepare('SELECT id, account_number, account_type, balance, created_at FROM accounts WHERE user_id = ?').all(req.session.userId);
  res.json(accounts);
});

// Account applications: customers apply, an admin approves, and only then
// is a real account created.
api.post('/applications', requireLogin, (req, res) => {
  const type = req.body && req.body.account_type;
  if (type !== 'savings' && type !== 'checking') return res.status(400).json({ error: 'account_type must be savings or checking' });

  const existing = db.prepare(
    "SELECT id FROM account_applications WHERE user_id = ? AND account_type = ? AND status = 'pending'"
  ).get(req.session.userId, type);
  if (existing) return res.status(409).json({ error: `You already have a pending application for a ${type} account` });

  const info = db.prepare('INSERT INTO account_applications (user_id, account_type) VALUES (?, ?)').run(req.session.userId, type);
  res.status(201).json({ id: info.lastInsertRowid, account_type: type, status: 'pending' });
});

api.get('/applications', requireLogin, (req, res) => {
  const rows = db.prepare('SELECT * FROM account_applications WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(req.session.userId);
  res.json(rows);
});

api.get('/accounts/:id/transactions', requireLogin, (req, res) => {
  const account = ownAccount(req, res, Number(req.params.id));
  if (!account) return;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const rows = db.prepare('SELECT * FROM transactions WHERE account_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?').all(account.id, limit, offset);
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM transactions WHERE account_id = ?').get(account.id);
  res.json({ transactions: rows, page, limit, total, total_pages: Math.ceil(total / limit) });
});

api.post('/accounts/:id/deposit', requireLogin, (req, res) => {
  const account = ownAccount(req, res, Number(req.params.id));
  if (!account) return;
  const amount = Number(req.body && req.body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });
  if (amount > 100000) return res.status(400).json({ error: 'Single deposit limit is 100,000' });

  const newBalance = account.balance + amount;
  const tx = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(newBalance, account.id);
    db.prepare('INSERT INTO transactions (account_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
      .run(account.id, 'deposit', amount, newBalance, req.body.description || 'Deposit');
  });
  tx();
  res.json({ account_id: account.id, balance: newBalance });
});

api.post('/accounts/:id/withdraw', requireLogin, (req, res) => {
  const account = ownAccount(req, res, Number(req.params.id));
  if (!account) return;
  const amount = Number(req.body && req.body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });
  if (amount > account.balance) return res.status(400).json({ error: 'Insufficient funds' });

  const newBalance = account.balance - amount;
  const tx = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(newBalance, account.id);
    db.prepare('INSERT INTO transactions (account_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
      .run(account.id, 'withdrawal', amount, newBalance, req.body.description || 'Withdrawal');
  });
  tx();
  res.json({ account_id: account.id, balance: newBalance });
});

api.post('/transfer', requireLogin, (req, res) => {
  const fromId = Number(req.body && req.body.from_account_id);
  const toNumber = String(req.body && req.body.to_account_number || '').trim();
  const amount = Number(req.body && req.body.amount);
  const description = req.body && req.body.description;

  const from = ownAccount(req, res, fromId);
  if (!from) return;
  if (!toNumber) return res.status(400).json({ error: 'Destination account number required' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });
  if (amount > from.balance) return res.status(400).json({ error: 'Insufficient funds' });

  const to = db.prepare('SELECT * FROM accounts WHERE account_number = ?').get(toNumber);
  if (!to) return res.status(404).json({ error: 'Destination account not found' });
  if (to.id === from.id) return res.status(400).json({ error: 'Cannot transfer to the same account' });

  try {
    transferMoney(from.id, to.id, amount, description || `Transfer to ${to.account_number}`);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  res.json({ from_balance: db.prepare('SELECT balance FROM accounts WHERE id = ?').get(from.id).balance });
});

// ---------- admin ----------

api.get('/admin/customers', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.email, u.role, u.created_at,
           COUNT(a.id) AS account_count,
           COALESCE(SUM(a.balance), 0) AS total_balance
    FROM users u
    LEFT JOIN accounts a ON a.user_id = u.id
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY u.id
  `).all();
  res.json(rows);
});

api.post('/admin/customers', requireAdmin, (req, res) => {
  const { username, password, full_name, email, account_type } = req.body || {};
  if (!username || !password || !full_name || !email) {
    return res.status(400).json({ error: 'username, password, full_name and email are required' });
  }
  if (findUserByUsername(String(username).trim())) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const type = account_type === 'checking' ? 'checking' : 'savings';
  const { hashPassword } = require('./auth');
  const tx = db.transaction(() => {
    const info = db.prepare('INSERT INTO users (username, password_hash, full_name, email, role) VALUES (?, ?, ?, ?, ?)')
      .run(String(username).trim(), hashPassword(String(password)), full_name, email, 'customer');
    db.prepare('INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, 0)')
      .run(info.lastInsertRowid, genAccountNumber(), type);
  });
  tx();
  res.status(201).json({ ok: true });
});

api.get('/admin/accounts', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT a.id, a.account_number, a.account_type, a.balance, a.created_at,
           u.id AS user_id, u.full_name, u.username
    FROM accounts a JOIN users u ON u.id = a.user_id
    ORDER BY a.id
  `).all();
  res.json(rows);
});

api.get('/admin/transactions', requireAdmin, (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 25);
  const offset = (page - 1) * limit;
  const rows = db.prepare(`
    SELECT t.*, a.account_number, u.full_name
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    JOIN users u ON u.id = a.user_id
    ORDER BY t.created_at DESC, t.id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM transactions').get();
  res.json({ transactions: rows, page, limit, total, total_pages: Math.ceil(total / limit) });
});

api.get('/admin/applications', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT ap.*, u.full_name, u.username
    FROM account_applications ap JOIN users u ON u.id = ap.user_id
    ORDER BY CASE ap.status WHEN 'pending' THEN 0 ELSE 1 END, ap.created_at DESC, ap.id DESC
  `).all();
  res.json(rows);
});

api.post('/admin/applications/:id/approve', requireAdmin, (req, res) => {
  const app = db.prepare('SELECT * FROM account_applications WHERE id = ?').get(Number(req.params.id));
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending') return res.status(400).json({ error: 'Application already decided' });

  const tx = db.transaction(() => {
    db.prepare(`UPDATE account_applications SET status = 'approved', decided_at = datetime('now') WHERE id = ?`).run(app.id);
    db.prepare('INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, 0)')
      .run(app.user_id, genAccountNumber(), app.account_type);
  });
  tx();
  res.json({ ok: true });
});

api.post('/admin/applications/:id/reject', requireAdmin, (req, res) => {
  const app = db.prepare('SELECT * FROM account_applications WHERE id = ?').get(Number(req.params.id));
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending') return res.status(400).json({ error: 'Application already decided' });

  db.prepare(`UPDATE account_applications SET status = 'rejected', rejection_reason = ?, decided_at = datetime('now') WHERE id = ?`)
    .run((req.body && req.body.reason) || null, app.id);
  res.json({ ok: true });
});

api.get('/admin/stats', requireAdmin, (req, res) => {
  const stats = {
    customers: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'").get().n,
    accounts: db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,
    pending_applications: db.prepare("SELECT COUNT(*) AS n FROM account_applications WHERE status = 'pending'").get().n,
    total_deposits: db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE type = 'deposit'").get().s,
    total_withdrawals: db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE type = 'withdrawal'").get().s,
    total_transfers: db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE type = 'transfer_out'").get().s,
    total_balance: db.prepare('SELECT COALESCE(SUM(balance), 0) AS s FROM accounts').get().s
  };
  res.json(stats);
});

// ---------- static pages ----------

app.use(express.static(path.join(__dirname, '..', 'public')));

// Page routes (static SPA-ish pages, each loads its own JS)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin-login.html')));

app.listen(PORT, () => {
  console.log(`Banking system running at http://localhost:${PORT}`);
});
