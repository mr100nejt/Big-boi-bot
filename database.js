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

  CREATE TABLE IF NOT EXISTS jackpot (
    guild_id TEXT PRIMARY KEY,
    amount INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cooldowns (
    user_id TEXT NOT NULL,
    command TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, command)
  );

  CREATE TABLE IF NOT EXISTS streaks (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    streak INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    price INTEGER NOT NULL,
    role_id TEXT,
    value REAL NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS inventory (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS lottery (
    guild_id TEXT PRIMARY KEY,
    ticket_price INTEGER NOT NULL DEFAULT 100,
    prize_pool INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS lottery_tickets (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );
`);

// Migrations
try { db.prepare('ALTER TABLE inventory ADD COLUMN active INTEGER NOT NULL DEFAULT 0').run(); } catch {}
try { db.prepare('ALTER TABLE shop_items ADD COLUMN exclusive INTEGER NOT NULL DEFAULT 0').run(); } catch {}

module.exports = db;
