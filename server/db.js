const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'orders.db');
const LEGACY_JSON = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone         TEXT NOT NULL,
    address       TEXT NOT NULL DEFAULT '',
    notes         TEXT NOT NULL DEFAULT '',
    order_type    TEXT NOT NULL DEFAULT 'collection',
    total         REAL NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id  INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id   TEXT,
    name      TEXT NOT NULL,
    price     REAL NOT NULL,
    quantity  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_name ON order_items(name);
`);

const stmts = {
  insertOrder: db.prepare(`
    INSERT INTO orders (customer_name, phone, address, notes, order_type, total, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  insertItem: db.prepare(`
    INSERT INTO order_items (order_id, item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)
  `),
  orderById: db.prepare(`SELECT * FROM orders WHERE id = ?`),
  itemsForOrder: db.prepare(`SELECT item_id, name, price, quantity FROM order_items WHERE order_id = ? ORDER BY id`),
  allOrders: db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`),
  ordersByDay: db.prepare(`SELECT * FROM orders WHERE substr(created_at, 1, 10) = ? ORDER BY created_at DESC`),
  updateStatus: db.prepare(`UPDATE orders SET status = ? WHERE id = ?`),
  deleteOrder: db.prepare(`DELETE FROM orders WHERE id = ?`),

  dayTotals: db.prepare(`
    SELECT COUNT(*) AS totalOrders, COALESCE(SUM(total), 0) AS totalRevenue
    FROM orders WHERE substr(created_at, 1, 10) = ?
  `),
  dayByStatus: db.prepare(`
    SELECT status, COUNT(*) AS n FROM orders WHERE substr(created_at, 1, 10) = ? GROUP BY status
  `),
  itemsSoldByPrefix: db.prepare(`
    SELECT oi.name, SUM(oi.quantity) AS quantity, SUM(oi.price * oi.quantity) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE substr(o.created_at, 1, ?) = ?
    GROUP BY oi.name ORDER BY quantity DESC
  `),
  totalsByPrefix: db.prepare(`
    SELECT COUNT(*) AS totalOrders, COALESCE(SUM(total), 0) AS totalRevenue
    FROM orders WHERE substr(created_at, 1, ?) = ?
  `),
  monthlyTotalsForYear: db.prepare(`
    SELECT substr(created_at, 6, 2) AS month, COUNT(*) AS totalOrders, COALESCE(SUM(total), 0) AS totalRevenue
    FROM orders WHERE substr(created_at, 1, 4) = ? GROUP BY month
  `),
  monthlyItemsForYear: db.prepare(`
    SELECT substr(o.created_at, 6, 2) AS month, oi.name, SUM(oi.quantity) AS quantity, SUM(oi.price * oi.quantity) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE substr(o.created_at, 1, 4) = ?
    GROUP BY month, oi.name ORDER BY month, quantity DESC
  `),
  itemByMonthForYear: db.prepare(`
    SELECT substr(o.created_at, 6, 2) AS month, SUM(oi.quantity) AS quantity, SUM(oi.price * oi.quantity) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE substr(o.created_at, 1, 4) = ? AND oi.name = ?
    GROUP BY month
  `),
  itemCountsInRange: db.prepare(`
    SELECT oi.name, SUM(oi.quantity) AS count
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= ? AND o.created_at <= ?
    GROUP BY oi.name
  `),
};

const round2 = n => Math.round(n * 100) / 100;

function toOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    items: stmts.itemsForOrder.all(row.id).map(i => ({ id: i.item_id, name: i.name, price: i.price, quantity: i.quantity })),
    notes: row.notes,
    orderType: row.order_type,
    total: row.total,
    status: row.status,
    createdAt: row.created_at,
  };
}

function createOrder({ customerName, phone, address = '', notes = '', orderType = 'collection', items, status = 'pending', createdAt }) {
  const total = round2(items.reduce((s, i) => s + i.price * i.quantity, 0));
  const ts = createdAt || new Date().toISOString();
  let orderId;
  db.exec('BEGIN');
  try {
    orderId = Number(stmts.insertOrder.run(customerName, phone, address, notes, orderType, total, status, ts).lastInsertRowid);
    for (const i of items) stmts.insertItem.run(orderId, i.id != null ? String(i.id) : null, i.name, i.price, i.quantity);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return getOrder(orderId);
}

const getOrder = id => toOrder(stmts.orderById.get(id));
const listOrders = date => (date ? stmts.ordersByDay.all(date) : stmts.allOrders.all()).map(toOrder);

function updateOrderStatus(id, status) {
  const res = stmts.updateStatus.run(status, id);
  return res.changes ? getOrder(id) : null;
}

const deleteOrder = id => stmts.deleteOrder.run(id).changes > 0;

const itemsSold = prefix => stmts.itemsSoldByPrefix.all(prefix.length, prefix).map(r => ({ ...r, revenue: round2(r.revenue) }));

function totalsFor(prefix) {
  const r = stmts.totalsByPrefix.get(prefix.length, prefix);
  return { totalOrders: r.totalOrders, totalRevenue: round2(r.totalRevenue) };
}

function dailySummary(date) {
  const t = stmts.dayTotals.get(date);
  const byStatus = Object.fromEntries(stmts.dayByStatus.all(date).map(r => [r.status, r.n]));
  return { date, totalOrders: t.totalOrders, totalRevenue: round2(t.totalRevenue), byStatus, topItems: itemsSold(date) };
}

// Returns { '01': { totalOrders, totalRevenue, items: [...] }, ... } for all months with data
function yearByMonth(year) {
  const y = String(year);
  const out = {};
  for (const r of stmts.monthlyTotalsForYear.all(y)) out[r.month] = { totalOrders: r.totalOrders, totalRevenue: round2(r.totalRevenue), items: [] };
  for (const r of stmts.monthlyItemsForYear.all(y)) out[r.month]?.items.push({ name: r.name, quantity: r.quantity, revenue: round2(r.revenue) });
  return out;
}

const itemByMonth = (year, name) => Object.fromEntries(stmts.itemByMonthForYear.all(String(year), name).map(r => [r.month, { quantity: r.quantity, revenue: round2(r.revenue) }]));

const itemCountsBetween = (start, end) => Object.fromEntries(stmts.itemCountsInRange.all(start.toISOString(), end.toISOString()).map(r => [r.name, r.count]));

// One-time import of the old orders.json, if present and the DB is empty
function migrateLegacyJson() {
  if (!fs.existsSync(LEGACY_JSON)) return;
  if (db.prepare('SELECT COUNT(*) AS n FROM orders').get().n > 0) return;
  let legacy;
  try { legacy = JSON.parse(fs.readFileSync(LEGACY_JSON, 'utf-8')); } catch (e) { console.error('Could not read legacy orders.json:', e); return; }
  if (!Array.isArray(legacy) || legacy.length === 0) return;
  db.exec('BEGIN');
  try {
    const ins = db.prepare(`INSERT INTO orders (id, customer_name, phone, address, notes, order_type, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const o of legacy) {
      ins.run(o.id, o.customerName, o.phone, o.address || '', o.notes || '', o.orderType || 'collection', o.total, o.status || 'pending', o.createdAt);
      for (const i of o.items || []) stmts.insertItem.run(o.id, i.id != null ? String(i.id) : null, i.name, i.price, i.quantity);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error('Legacy import failed:', e);
    return;
  }
  fs.renameSync(LEGACY_JSON, LEGACY_JSON + '.migrated');
  console.log(`Imported ${legacy.length} orders from orders.json into SQLite`);
}

migrateLegacyJson();

module.exports = {
  db,
  createOrder, getOrder, listOrders, updateOrderStatus, deleteOrder,
  dailySummary, itemsSold, totalsFor, yearByMonth, itemByMonth, itemCountsBetween,
};
