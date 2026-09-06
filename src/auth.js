const crypto = require('crypto');
const db = require('./db');

// Simple salted SHA-256 hashing (demo-grade; not for production).
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

function genAccountNumber() {
  return 'ACCT' + crypto.randomInt(10000000, 99999999);
}

function findUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return db.prepare('SELECT id, username, full_name, email, role, created_at FROM users WHERE id = ?').get(id);
}

// Transfer money between two accounts atomically; throws on insufficient funds.
function transferMoney(fromAccountId, toAccountId, amount, description) {
  const tx = db.transaction(() => {
    const from = db.prepare('SELECT * FROM accounts WHERE id = ?').get(fromAccountId);
    const to = db.prepare('SELECT * FROM accounts WHERE id = ?').get(toAccountId);
    if (!from || !to) throw new Error('Account not found');
    if (from.balance < amount) throw new Error('Insufficient funds');

    const newFrom = from.balance - amount;
    const newTo = to.balance + amount;

    db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(newFrom, fromAccountId);
    db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(newTo, toAccountId);

    db.prepare(
      'INSERT INTO transactions (account_id, type, amount, balance_after, description, related_account_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(fromAccountId, 'transfer_out', amount, newFrom, description || 'Transfer', toAccountId);
    db.prepare(
      'INSERT INTO transactions (account_id, type, amount, balance_after, description, related_account_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(toAccountId, 'transfer_in', amount, newTo, description || 'Transfer', fromAccountId);
  });
  tx();
}

module.exports = { hashPassword, verifyPassword, genAccountNumber, findUserByUsername, getUserById, transferMoney };
