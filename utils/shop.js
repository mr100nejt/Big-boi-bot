const db = require('../database');

function getShopItems(guildId) {
  return db.prepare('SELECT * FROM shop_items WHERE guild_id = ? ORDER BY price ASC').all(guildId);
}

function getItemByName(guildId, name) {
  return db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND LOWER(name) = LOWER(?)').get(guildId, name);
}

function getItemById(id) {
  return db.prepare('SELECT * FROM shop_items WHERE id = ?').get(id);
}

function addShopItem(guildId, name, description, type, price, roleId = null, value = 1, exclusive = 0) {
  return db.prepare(`
    INSERT INTO shop_items (guild_id, name, description, type, price, role_id, value, exclusive)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, name, description, type, price, roleId, value, exclusive);
}

function removeShopItem(id, guildId) {
  return db.prepare('DELETE FROM shop_items WHERE id = ? AND guild_id = ?').run(id, guildId);
}

function getInventory(userId, guildId) {
  return db.prepare(`
    SELECT s.*, i.quantity, i.active FROM inventory i
    JOIN shop_items s ON i.item_id = s.id
    WHERE i.user_id = ? AND i.guild_id = ? AND i.quantity > 0
    ORDER BY s.name ASC
  `).all(userId, guildId);
}

// Arms one copy of an item so it will fire on next relevant game event.
function activateItem(userId, guildId, itemId) {
  const row = db.prepare(
    'SELECT quantity, active FROM inventory WHERE user_id = ? AND guild_id = ? AND item_id = ?'
  ).get(userId, guildId, itemId);
  if (!row || row.active >= row.quantity) return false;
  db.prepare(
    'UPDATE inventory SET active = active + 1 WHERE user_id = ? AND guild_id = ? AND item_id = ?'
  ).run(userId, guildId, itemId);
  return true;
}

// Consumes one ARMED item of the given type. Returns value or null.
function consumeActiveItem(userId, guildId, type) {
  const row = db.prepare(`
    SELECT i.item_id, s.value FROM inventory i
    JOIN shop_items s ON i.item_id = s.id
    WHERE i.user_id = ? AND i.guild_id = ? AND s.type = ? AND i.active > 0
    LIMIT 1
  `).get(userId, guildId, type);
  if (!row) return null;
  db.prepare(
    'UPDATE inventory SET quantity = quantity - 1, active = active - 1 WHERE user_id = ? AND guild_id = ? AND item_id = ?'
  ).run(userId, guildId, row.item_id);
  return row.value;
}

function addToInventory(userId, guildId, itemId, qty = 1) {
  db.prepare(`
    INSERT INTO inventory (user_id, guild_id, item_id, quantity) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, guild_id, item_id) DO UPDATE SET quantity = quantity + excluded.quantity
  `).run(userId, guildId, itemId, qty);
}

// Consumes one item of the given type from inventory.
// Returns the item's value on success, null if not owned.
function consumeItem(userId, guildId, type) {
  const row = db.prepare(`
    SELECT i.item_id, s.value FROM inventory i
    JOIN shop_items s ON i.item_id = s.id
    WHERE i.user_id = ? AND i.guild_id = ? AND s.type = ? AND i.quantity > 0
    LIMIT 1
  `).get(userId, guildId, type);
  if (!row) return null;
  db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE user_id = ? AND guild_id = ? AND item_id = ?')
    .run(userId, guildId, row.item_id);
  return row.value;
}

function hasItem(userId, guildId, type) {
  const row = db.prepare(`
    SELECT 1 FROM inventory i
    JOIN shop_items s ON i.item_id = s.id
    WHERE i.user_id = ? AND i.guild_id = ? AND s.type = ? AND i.quantity > 0
    LIMIT 1
  `).get(userId, guildId, type);
  return !!row;
}

// --- Lottery ---

function getLottery(guildId) {
  return db.prepare('SELECT * FROM lottery WHERE guild_id = ?').get(guildId);
}

function ensureLottery(guildId) {
  db.prepare(`
    INSERT OR IGNORE INTO lottery (guild_id, ticket_price, prize_pool, active)
    VALUES (?, 100, 0, 1)
  `).run(guildId);
  return getLottery(guildId);
}

function setLotteryTicketPrice(guildId, price) {
  ensureLottery(guildId);
  db.prepare('UPDATE lottery SET ticket_price = ? WHERE guild_id = ?').run(price, guildId);
}

function addToLotteryPool(guildId, amount) {
  ensureLottery(guildId);
  db.prepare('UPDATE lottery SET prize_pool = prize_pool + ? WHERE guild_id = ?').run(amount, guildId);
}

function resetLottery(guildId) {
  db.prepare('UPDATE lottery SET prize_pool = 0 WHERE guild_id = ?').run(guildId);
  db.prepare('DELETE FROM lottery_tickets WHERE guild_id = ?').run(guildId);
}

function getLotteryTickets(guildId, userId) {
  const row = db.prepare('SELECT quantity FROM lottery_tickets WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  return row ? row.quantity : 0;
}

function addLotteryTickets(guildId, userId, qty) {
  db.prepare(`
    INSERT INTO lottery_tickets (guild_id, user_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET quantity = quantity + excluded.quantity
  `).run(guildId, userId, qty);
}

function getAllLotteryTickets(guildId) {
  return db.prepare('SELECT user_id, quantity FROM lottery_tickets WHERE guild_id = ? AND quantity > 0').all(guildId);
}

// Picks a weighted random winner from ticket holders. Returns userId or null.
function drawLotteryWinner(guildId) {
  const entries = getAllLotteryTickets(guildId);
  if (!entries.length) return null;
  const pool = entries.flatMap(e => Array(e.quantity).fill(e.user_id));
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
  getShopItems, getItemByName, getItemById, addShopItem, removeShopItem,
  getInventory, addToInventory, consumeItem, hasItem, activateItem, consumeActiveItem,
  getLottery, ensureLottery, setLotteryTicketPrice, addToLotteryPool, resetLottery,
  getLotteryTickets, addLotteryTickets, getAllLotteryTickets, drawLotteryWinner,
};
