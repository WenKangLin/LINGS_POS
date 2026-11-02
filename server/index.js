const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const menuStore = require('./menu');
const backup = require('./backup');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the built client in production
app.use(express.static(path.join(__dirname, '../client/dist')));

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const mm = m => String(m).padStart(2, '0');

// API Routes
app.get('/api/menu', (req, res) => {
  res.json(menuStore.get());
});

app.post('/api/menu/reload', (req, res) => {
  try {
    const m = menuStore.reload();
    res.json({ ok: true, sections: m.sections.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/orders', (req, res) => {
  const { customerName, phone, address, items, notes, orderType } = req.body;

  if (!customerName || !phone || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (orderType === 'delivery' && !address?.trim()) {
    return res.status(400).json({ error: 'Delivery orders need an address' });
  }

  // Prices come from the menu, never from the client
  const priced = [];
  for (const i of items) {
    const price = menuStore.priceFor(i.id);
    if (price == null) return res.status(400).json({ error: `Unknown menu item: ${i.name || i.id}` });
    const quantity = parseInt(i.quantity);
    if (!(quantity > 0)) return res.status(400).json({ error: `Invalid quantity for ${i.name}` });
    priced.push({ id: i.id, name: i.name, price, quantity });
  }

  const order = db.createOrder({ customerName, phone, address, items: priced, notes, orderType });
  res.status(201).json(order);
});

app.post('/api/backup', (req, res) => {
  try {
    res.json({ ok: true, file: backup.runBackup(db.db) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/orders', (req, res) => {
  res.json(db.listOrders(req.query.date));
});

app.patch('/api/orders/:id', (req, res) => {
  const order = db.updateOrderStatus(parseInt(req.params.id), req.body.status);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.delete('/api/orders/:id', (req, res) => {
  db.deleteOrder(parseInt(req.params.id));
  res.status(204).send();
});

// --- Daily summary (end-of-night totals) ---
app.get('/api/summary/daily', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json(db.dailySummary(date));
});

// --- Monthly per-item analytics ---
app.get('/api/analytics/monthly', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = req.query.month ? parseInt(req.query.month) : null;

  if (month) {
    const prefix = `${year}-${mm(month)}`;
    return res.json({
      year, month, monthName: MONTH_NAMES[month - 1],
      ...db.totalsFor(prefix),
      items: db.itemsSold(prefix),
    });
  }

  // Return all 12 months overview
  const byMonth = db.yearByMonth(year);
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const data = byMonth[mm(m)] || { totalOrders: 0, totalRevenue: 0, items: [] };
    months.push({ month: m, monthName: MONTH_NAMES[m - 1], ...data });
  }
  res.json({ year, months });
});

// --- Compare a specific item across months ---
app.get('/api/analytics/item', (req, res) => {
  const { name, year: yearParam } = req.query;
  const year = parseInt(yearParam) || new Date().getFullYear();
  if (!name) return res.status(400).json({ error: 'name query param required' });

  const byMonth = db.itemByMonth(year, name);
  const breakdown = [];
  for (let m = 1; m <= 12; m++) {
    const data = byMonth[mm(m)] || { quantity: 0, revenue: 0 };
    breakdown.push({ month: m, monthName: MONTH_NAMES[m - 1].slice(0, 3), ...data });
  }
  res.json({ name, year, breakdown });
});

// --- Item Tracker: all menu items with period counts ---
app.get('/api/analytics/item-tracker', (req, res) => {
  const period = req.query.period || 'week'; // week | month | year
  const offset = parseInt(req.query.offset) || 0; // 0 = current period, 1 = previous, etc.

  function getDateRange(periodType, periodOffset) {
    const now = new Date();
    let start, end;

    if (periodType === 'week') {
      const day = now.getDay() || 7; // Mon=1 ... Sun=7
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + 1 - periodOffset * 7);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      start = monday;
      end = sunday;
    } else if (periodType === 'month') {
      const targetMonth = now.getMonth() - periodOffset;
      const targetDate = new Date(now.getFullYear(), targetMonth, 1);
      start = targetDate;
      end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else { // year
      const targetYear = now.getFullYear() - periodOffset;
      start = new Date(targetYear, 0, 1);
      end = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    }

    return { start, end };
  }

  const current = getDateRange(period, offset);
  const previous = getDateRange(period, offset + 1);

  // Build label for the period
  function periodLabel(range, periodType) {
    const opts = { day: 'numeric', month: 'short' };
    if (periodType === 'week') {
      return `${range.start.toLocaleDateString('en-IE', opts)} – ${range.end.toLocaleDateString('en-IE', opts)}`;
    } else if (periodType === 'month') {
      return range.start.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' });
    } else {
      return range.start.getFullYear().toString();
    }
  }

  const currentCounts = db.itemCountsBetween(current.start, current.end);
  const previousCounts = db.itemCountsBetween(previous.start, previous.end);

  // Collect all menu item names
  const allItems = [];
  menuStore.get().sections.forEach(section => {
    if (section.items) {
      section.items.forEach(item => allItems.push(item.name));
    }
    if (section.subsections) {
      section.subsections.forEach(sub => {
        sub.items.forEach(item => allItems.push(item.name));
      });
    }
  });

  const items = allItems.map(name => ({
    name,
    count: currentCounts[name] || 0,
    previousCount: previousCounts[name] || 0,
  }));

  res.json({
    period,
    offset,
    label: periodLabel(current, period),
    previousLabel: periodLabel(previous, period),
    items,
  });
});

// Catch-all: serve client for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🥡 Chinese Takeaway Server running on http://localhost:${PORT}`);
  backup.schedule(db.db);
});
