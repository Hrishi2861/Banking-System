const db = require('./db');
const { hashPassword, genAccountNumber, transferMoney } = require('./auth');

db.exec('DELETE FROM transactions');
db.exec('DELETE FROM accounts');
db.exec('DELETE FROM account_applications');
db.exec('DELETE FROM users');

const insertUser = db.prepare('INSERT INTO users (username, password_hash, full_name, email, role) VALUES (?, ?, ?, ?, ?)');
const insertAccount = db.prepare('INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?)');
const insertTx = db.prepare('INSERT INTO transactions (account_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?)');

const users = [
  { username: 'admin', password: 'admin123', full_name: 'Site Admin', email: 'admin@bankdemo.com', role: 'admin' },
  { username: 'john', password: 'john123', full_name: 'John Sharma', email: 'john@example.com', role: 'customer' },
  { username: 'alice', password: 'alice123', full_name: 'Alice Verma', email: 'alice@example.com', role: 'customer' },
  { username: 'raj', password: 'raj123', full_name: 'Raj Patel', email: 'raj@example.com', role: 'customer' }
];

const userIds = {};
for (const u of users) {
  const info = insertUser.run(u.username, hashPassword(u.password), u.full_name, u.email, u.role);
  userIds[u.username] = info.lastInsertRowid;
}

const accIds = {};
function addAccount(username, type, balance, txs) {
  const num = genAccountNumber();
  const info = insertAccount.run(userIds[username], num, type, balance);
  accIds[`${username}:${type}`] = info.lastInsertRowid;
  let bal = 0;
  let day = 25;
  for (const [type_, amount, desc] of txs) {
    bal = type_ === 'deposit' ? bal + amount : bal - amount;
    insertTx.run(info.lastInsertRowid, type_, amount, bal, desc, `2026-08-${String(day--).padStart(2, '0')} 10:00:00`);
  }
  return { id: info.lastInsertRowid, number: num };
}

const johnSavings = addAccount('john', 'savings', 5200, [
  ['deposit', 5000, 'Initial deposit'],
  ['deposit', 300, 'Salary credit'],
  ['withdrawal', 100, 'ATM withdrawal']
]);
addAccount('john', 'checking', 800, [
  ['deposit', 1000, 'Transfer from savings'],
  ['withdrawal', 200, 'Groceries']
]);

const aliceSavings = addAccount('alice', 'savings', 15400, [
  ['deposit', 15000, 'Initial deposit'],
  ['deposit', 600, 'Freelance payment'],
  ['withdrawal', 200, 'Utility bill']
]);
addAccount('alice', 'checking', 2300, [
  ['deposit', 2500, 'Initial deposit'],
  ['withdrawal', 200, 'Shopping']
]);

const rajSavings = addAccount('raj', 'savings', 7800, [
  ['deposit', 8000, 'Initial deposit'],
  ['withdrawal', 200, 'Rent payment']
]);

// A couple of transfers between the seeded accounts
transferMoney(johnSavings.id, aliceSavings.id, 200, 'Rent share');
transferMoney(rajSavings.id, johnSavings.id, 150, 'Dinner split');

// Demo account applications: one pending for admin review, one already rejected
db.prepare("INSERT INTO account_applications (user_id, account_type, status) VALUES (?, 'checking', 'pending')")
  .run(userIds.raj);
db.prepare("INSERT INTO account_applications (user_id, account_type, status, rejection_reason, decided_at) VALUES (?, 'savings', 'rejected', 'Existing savings account already active', datetime('now', '-2 days'))")
  .run(userIds.alice);

console.log('Seed complete. Logins:');
console.log('  admin / admin123 (admin panel)');
for (const u of users.filter(u => u.role === 'customer')) {
  console.log(`  ${u.username} / ${u.password}`);
}
