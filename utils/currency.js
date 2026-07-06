const db = require('../database');

function ensureUser(userId, guildId) {
  db.prepare(`
    INSERT OR IGNORE INTO users (user_id, guild_id, balance)
    VALUES (?, ?, 0)
  `).run(userId, guildId);
}

function getBalance(userId, guildId) {
  ensureUser(userId, guildId);
  return db.prepare('SELECT balance FROM users WHERE user_id = ? AND guild_id = ?')
    .get(userId, guildId).balance;
}

function addBalance(userId, guildId, amount) {
  ensureUser(userId, guildId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE user_id = ? AND guild_id = ?')
    .run(amount, userId, guildId);
}

function removeBalance(userId, guildId, amount) {
  ensureUser(userId, guildId);
  db.prepare('UPDATE users SET balance = MAX(0, balance - ?) WHERE user_id = ? AND guild_id = ?')
    .run(amount, userId, guildId);
}

function setLastDaily(userId, guildId, timestamp) {
  ensureUser(userId, guildId);
  db.prepare('UPDATE users SET last_daily = ? WHERE user_id = ? AND guild_id = ?')
    .run(timestamp, userId, guildId);
}

function getLastDaily(userId, guildId) {
  ensureUser(userId, guildId);
  return db.prepare('SELECT last_daily FROM users WHERE user_id = ? AND guild_id = ?')
    .get(userId, guildId).last_daily;
}

function resetDailyAll(guildId) {
  db.prepare('UPDATE users SET last_daily = 0 WHERE guild_id = ?').run(guildId);
}

function resetDailyUser(userId, guildId) {
  ensureUser(userId, guildId);
  db.prepare('UPDATE users SET last_daily = 0 WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

function getDailyRoles(guildId) {
  return db.prepare('SELECT role_id, amount FROM daily_roles WHERE guild_id = ?')
    .all(guildId);
}

function setDailyRole(guildId, roleId, amount) {
  db.prepare(`
    INSERT INTO daily_roles (guild_id, role_id, amount)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id, role_id) DO UPDATE SET amount = excluded.amount
  `).run(guildId, roleId, amount);
}

function removeDailyRole(guildId, roleId) {
  db.prepare('DELETE FROM daily_roles WHERE guild_id = ? AND role_id = ?')
    .run(guildId, roleId);
}

function ensureLoan(userId, guildId) {
  db.prepare(`
    INSERT OR IGNORE INTO loans (user_id, guild_id, principal, owed, cooldown_until)
    VALUES (?, ?, 0, 0, 0)
  `).run(userId, guildId);
}

function getLoan(userId, guildId) {
  ensureLoan(userId, guildId);
  return db.prepare('SELECT * FROM loans WHERE user_id = ? AND guild_id = ?')
    .get(userId, guildId);
}

function issueLoan(userId, guildId, principal, owed) {
  ensureLoan(userId, guildId);
  db.prepare('UPDATE loans SET principal = ?, owed = ?, cooldown_until = 0 WHERE user_id = ? AND guild_id = ?')
    .run(principal, owed, userId, guildId);
}

function repayLoan(userId, guildId, amount) {
  ensureLoan(userId, guildId);
  db.prepare('UPDATE loans SET owed = MAX(0, owed - ?) WHERE user_id = ? AND guild_id = ?')
    .run(amount, userId, guildId);
}

function setLoanCooldown(userId, guildId, until) {
  ensureLoan(userId, guildId);
  db.prepare('UPDATE loans SET cooldown_until = ? WHERE user_id = ? AND guild_id = ?')
    .run(until, userId, guildId);
}

function getJackpot(guildId) {
  const row = db.prepare('SELECT amount FROM jackpot WHERE guild_id = ?').get(guildId);
  return row ? row.amount : 0;
}

function feedJackpot(guildId, amount) {
  const feed = Math.floor(amount);
  if (feed <= 0) return;
  db.prepare(`
    INSERT INTO jackpot (guild_id, amount) VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET amount = amount + excluded.amount
  `).run(guildId, feed);
}

function claimJackpot(guildId) {
  const amount = getJackpot(guildId);
  if (amount > 0) db.prepare('UPDATE jackpot SET amount = 0 WHERE guild_id = ?').run(guildId);
  return amount;
}

module.exports = {
  getBalance, addBalance, removeBalance,
  setLastDaily, getLastDaily, resetDailyAll, resetDailyUser,
  getDailyRoles, setDailyRole, removeDailyRole,
  getLoan, issueLoan, repayLoan, setLoanCooldown,
  getJackpot, feedJackpot, claimJackpot,
};
