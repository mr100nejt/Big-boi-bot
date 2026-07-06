const db = require('../database');

function getStreak(userId, guildId) {
  const row = db.prepare('SELECT streak FROM streaks WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return row ? row.streak : 0;
}

function recordWin(userId, guildId) {
  const next = getStreak(userId, guildId) + 1;
  db.prepare(`
    INSERT INTO streaks (user_id, guild_id, streak) VALUES (?, ?, ?)
    ON CONFLICT(user_id, guild_id) DO UPDATE SET streak = excluded.streak
  `).run(userId, guildId, next);
  return next;
}

function resetStreak(userId, guildId) {
  db.prepare(`
    INSERT INTO streaks (user_id, guild_id, streak) VALUES (?, ?, 0)
    ON CONFLICT(user_id, guild_id) DO UPDATE SET streak = 0
  `).run(userId, guildId);
}

// +10% per consecutive win starting at 2nd, capped at +50%
function streakBonus(streak) {
  if (streak < 2) return 0;
  return Math.min((streak - 1) * 0.1, 0.5);
}

module.exports = { getStreak, recordWin, resetStreak, streakBonus };
