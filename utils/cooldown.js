const db = require('../database');

function checkCooldown(userId, command) {
  const row = db.prepare('SELECT expires_at FROM cooldowns WHERE user_id = ? AND command = ?').get(userId, command);
  if (!row) return 0;
  const remaining = row.expires_at - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

function setCooldown(userId, command, seconds) {
  db.prepare(`
    INSERT INTO cooldowns (user_id, command, expires_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id, command) DO UPDATE SET expires_at = excluded.expires_at
  `).run(userId, command, Date.now() + seconds * 1000);
}

module.exports = { checkCooldown, setCooldown };
