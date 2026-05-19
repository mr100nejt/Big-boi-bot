const Database = require('better-sqlite3');
const db = new Database('economy.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    balance INTEGER DEFAULT 0,
    last_daily INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS daily_roles (
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    PRIMARY KEY (guild_id, role_id)
  );

  CREATE TABLE IF NOT EXISTS loans (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    principal INTEGER NOT NULL DEFAULT 0,
    owed INTEGER NOT NULL DEFAULT 0,
    cooldown_until INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );
`);

module.exports = db;
