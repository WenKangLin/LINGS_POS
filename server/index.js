const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the built client in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// --- File-based persistence ---
const DATA_DIR = path.join(__dirname, '../data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
    }
  } catch (e) { console.error('Error loading orders:', e); }
  return [];
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

let orders = loadOrders();
let orderIdCounter = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;

// Allergen reference
const ALLERGENS = {
  1: 'Gluten', 2: 'Crustaceans', 3: 'Egg', 4: 'Fish', 5: 'Peanuts',
  6: 'Soya Bean', 7: 'Milk', 8: 'Nuts', 9: 'Celery', 10: 'Mustard',
  11: 'Sesame', 12: 'Sulphur Dioxide', 13: 'Lupin', 14: 'Molluscs',
};

// Menu data — based on Ling's Chinese Takeaway, Tagoat
let idCounter = 1;
const id = () => idCounter++;

const menu = {
  allergens: ALLERGENS,
  currency: '€',
  sections: [
    {
      name: 'Starters',
      items: [
        { id: id(), name: 'Spring Roll', price: 4.20, allergens: [1, 3] },
        { id: id(), name: 'Vegetable Roll', price: 4.20, allergens: [1, 3], vegetarian: true },
        { id: id(), name: 'Chicken Cheese Roll', price: 5.50, allergens: [1, 3, 7] },
        { id: id(), name: 'Skewered Chicken Satay', price: 7.50, allergens: [1, 3, 5, 6, 7] },
        { id: id(), name: 'Crispy Won Ton', price: 6.50, allergens: [1, 2, 9] },
        { id: id(), name: 'Sesame Prawn Toast', price: 6.50, allergens: [1, 2, 3, 6, 11] },
        { id: id(), name: 'Deep Fried Mushrooms', price: 5.50, allergens: [1, 3, 6, 11], vegetarian: true },
        { id: id(), name: 'Chicken Wings', price: 7.50, allergens: [1, 3, 6, 11], options: ['Salt & Chilli', 'BBQ', 'Honey', 'Sweet & Sour', 'Plain', 'Other'] },
        { id: id(), name: 'Salt & Chilli Shredded Chicken', price: 7.50, allergens: [1, 3, 6, 11] },
        { id: id(), name: 'Salt & Chilli King Prawns', price: 7.50, allergens: [1, 2, 3, 6, 11] },
        { id: id(), name: 'Salt & Chilli Squid', price: 7.50, allergens: [1, 3, 6, 11, 14] },
        { id: id(), name: 'Spare Ribs', price: 8.50, allergens: [1, 3, 6, 11], options: ['Salt & Chilli', 'BBQ', 'Honey', 'Sweet & Sour', 'Plain', 'Other'] },
        { id: id(), name: 'Crispy Aromatic Duck (1/4)', price: 11.00, allergens: [1, 3, 6, 11] },
        { id: id(), name: 'Crispy Aromatic Duck (1/2)', price: 20.00, allergens: [1, 3, 6, 11] },
      ],
    },
    {
      name: 'Soups',
      items: [
        { id: id(), name: 'Chicken Sweetcorn Soup', price: 4.20, allergens: [3, 6] },
        { id: id(), name: 'Chicken Mushroom Soup', price: 4.20, allergens: [] },
        { id: id(), name: 'Chicken Noodle Soup', price: 4.20, allergens: [11, 14] },
        { id: id(), name: 'Won Ton Soup', price: 5.00, allergens: [1, 7, 14] },
        { id: id(), name: 'Hot & Sour Soup', price: 5.00, allergens: [1, 2, 3, 11] },
        { id: id(), name: 'Tom Yum Prawn Soup', price: 5.00, allergens: [1, 2, 4, 11] },
      ],
    },
    {
      name: 'Build Your Own',
      buildYourOwn: true,
      proteins: [
        { name: 'Chicken', price: 12.00 },
        { name: 'Beef', price: 12.40 },
        { name: 'King Prawn', price: 12.80 },
        { name: 'House Special', price: 12.80 },
        { name: 'Duck', price: 14.00 },
        { name: 'Tofu', price: 11.00 },
        { name: 'Mixed Vegetable', price: 11.00 },
        { name: 'Shredded Chicken', price: 12.20 },
        { name: 'Shredded Beef', price: 12.80 },
        { name: 'Cantonese Chicken', price: 12.00 },
        { name: 'Cantonese King Prawn', price: 12.80 },
        { name: 'Crispy Chicken', price: 12.20 },
      ],
      sizes: { small: 1.50, medium: 3.00, large: 3.50 , smallTray: 5.00,largeTray: 6.00 },
      items: [
        { id: id(), name: 'Curry', allergens: [], buildYourOwn: true },
        { id: id(), name: 'Sweet & Sour', allergens: [1, 6, 11], buildYourOwn: true },
        { id: id(), name: 'BBQ', allergens: [1, 3, 6, 11], buildYourOwn: true },
        { id: id(), name: 'Satay', allergens: [1, 3, 5, 6, 7], buildYourOwn: true },
        { id: id(), name: 'Black Bean', allergens: [6, 11], buildYourOwn: true },
        { id: id(), name: 'Garlic Black Pepper', allergens: [14], buildYourOwn: true },
        { id: id(), name: 'Ginger & Spring Onion', allergens: [14], buildYourOwn: true },
        { id: id(), name: 'Oyster', allergens: [1, 3, 7, 10, 14], buildYourOwn: true },
        { id: id(), name: 'Mushroom', allergens: [14], buildYourOwn: true },
        { id: id(), name: 'Cashew Nut', allergens: [], buildYourOwn: true },
        { id: id(), name: 'Szechuan', allergens: [6, 11], buildYourOwn: true },
        { id: id(), name: 'Hot Garlic', allergens: [6, 11], buildYourOwn: true },
        { id: id(), name: 'Thai Green Curry', allergens: [1, 3, 7, 10, 14], buildYourOwn: true },
        { id: id(), name: 'Thai Sweet Chilli & Lemongrass', allergens: [1, 3, 6, 9, 11], buildYourOwn: true },
        { id: id(), name: 'Peking', allergens: [1, 3, 6, 7, 9, 10, 11], buildYourOwn: true },
        { id: id(), name: 'Plum', allergens: [1, 3, 6, 7, 9, 10, 11], buildYourOwn: true },
        { id: id(), name: 'Orange', allergens: [1, 6], buildYourOwn: true },
        { id: id(), name: 'Lemon', allergens: [], buildYourOwn: true },
        { id: id(), name: 'Pineapple', allergens: [], buildYourOwn: true },
        { id: id(), name: 'Honey', allergens: [], buildYourOwn: true },
      ],
    },
    {
      name: "Chef's Special Dishes",
      items: [
        { id: id(), name: 'Thai Sweet Chilli & Lemongrass', allergens: [1, 3, 6, 9, 11], proteinOptions: [
          { name: 'Crispy Chicken', price: 12.80 }, { name: 'Crispy Beef', price: 13.40 }, { name: 'Crispy King Prawn', price: 13.80 },
        ]},
        { id: id(), name: 'Thai Green Curry', allergens: [1, 3, 7, 10, 14], proteinOptions: [
          { name: 'Chicken', price: 12.80 }, { name: 'Beef', price: 13.40 }, { name: 'King Prawn', price: 13.80 },
        ]},
        { id: id(), name: 'Amber Fire', allergens: [1, 5, 6, 11], proteinOptions: [
          { name: 'Chicken', price: 12.80 }, { name: 'Beef', price: 13.40 }, { name: 'King Prawn', price: 13.80 }, { name: 'Shredded Chicken', price: 13.80 }, { name: 'Shredded Beef', price: 14.40 },
        ]},
        { id: id(), name: 'Roast Pork Chinese Style', price: 12.80, allergens: [1, 6, 9, 11] },
        { id: id(), name: 'Roast Duck Cantonese Style', price: 14.00, allergens: [6, 11] },
      ],
    },
    {
      name: 'Sweet & Sour Dishes',
      items: [
        { id: id(), name: 'Sweet & Sour Chicken Balls', price: 12.00, allergens: [1, 3, 6, 11] },
        { id: id(), name: 'Cantonese Sweet & Sour Chicken', price: 12.00, allergens: [1, 6, 11] },
        { id: id(), name: 'Cantonese Sweet & Sour King Prawn', price: 12.80, allergens: [1, 2, 6, 11] },
        { id: id(), name: 'Crispy Shredded Chicken with Sweet Chilli', price: 12.20, allergens: [1, 3, 6, 11] },
        { id: id(), name: 'Crispy Chicken with Plum Sauce', price: 12.20, allergens: [1, 3, 6, 8, 11, 14] },
        { id: id(), name: 'Crispy Chicken with Orange Sauce', price: 12.20, allergens: [1, 3, 6, 11, 14] },
        { id: id(), name: 'Crispy Chicken with Lemon Sauce', price: 12.20, allergens: [1, 3, 6, 11, 14] },
        { id: id(), name: 'Crispy Chicken with Pineapple Sauce', price: 12.20, allergens: [1, 3, 6, 11, 14] },
      ],
    },
    {
      name: 'Chow Mein Dishes',
      items: [
        { id: id(), name: 'Chicken Chow Mein', price: 12.00, allergens: [1, 6, 11, 14] },
        { id: id(), name: 'Beef Chow Mein', price: 12.40, allergens: [1, 6, 11, 14] },
        { id: id(), name: 'King Prawn Chow Mein', price: 12.80, allergens: [1, 2, 6, 11, 14] },
        { id: id(), name: 'House Special Chow Mein', price: 12.80, allergens: [1, 2, 6, 11, 14] },
        { id: id(), name: 'Singapore Chow Mein', price: 12.80, allergens: [1, 2, 6, 11, 14] },
        { id: id(), name: 'Mixed Vegetable Chow Mein', price: 11.00, allergens: [1, 6, 11, 14], vegetarian: true },
      ],
    },
    {
      name: 'Fried Rice Dishes',
      items: [
        { id: id(), name: 'Chicken Fried Rice', price: 12.00, allergens: [1, 3, 6, 11] },
        { id: id(), name: 'Beef Fried Rice', price: 12.40, allergens: [1, 3, 6, 11] },
        { id: id(), name: 'King Prawn Fried Rice', price: 12.80, allergens: [1, 2, 3, 6, 11] },
        { id: id(), name: 'House Special Fried Rice', price: 12.80, allergens: [1, 2, 3, 6, 11] },
        { id: id(), name: 'Singapore Fried Rice', price: 12.80, allergens: [1, 2, 3, 6, 11] },
      ],
    },
    {
      name: "Children's Dishes",
      items: [
        { id: id(), name: 'Chicken Goujons & Chips', price: 7.00, allergens: [1] },
        { id: id(), name: 'Chicken Nuggets & Chips', price: 7.00, allergens: [1] },
        { id: id(), name: 'Sausages & Chips', price: 7.00, allergens: [1] },
        { id: id(), name: 'Chicken Balls (4) & Chips', price: 7.00, allergens: [1] },
      ],
    },
    {
      name: 'Side Orders',
      items: [
        { id: id(), name: 'Mega Box', price: 15.00, allergens: [1, 3, 6, 11] },
        { id: id(), name: 'Hot Spicy Bag', price: 10.50, allergens: [1, 3, 6, 11] },
        { id: id(), name: 'Tofu Spicy Bag', price: 10.50, allergens: [], vegetarian: true },
        { id: id(), name: 'Chicken Wrap', price: 8.00, allergens: [1, 3, 6, 7, 9, 10, 11] },
        { id: id(), name: '2 in 1', price: 5.50, allergens: [] },
        { id: id(), name: '3 in 1', price: 6.50, allergens: [] },
        { id: id(), name: '4 in 1', price: 8.50, allergens: [] },
        { id: id(), name: 'Chicken Balls (4)', price: 4.50, allergens: [1, 3, 7, 9] },
        { id: id(), name: 'Chicken Balls (8)', price: 8.40, allergens: [1, 3, 7, 9] },
        { id: id(), name: 'Onion Rings', price: 4.80, allergens: [1, 3, 6, 11] },
        { id: id(), name: '1/2 & 1/2 (Chips & Rice)', price: 3.30, allergens: [], vegetarian: true },
        { id: id(), name: 'Chips', price: 3.30, allergens: [], vegetarian: true },
        { id: id(), name: 'Boiled Rice', price: 3.30, allergens: [], vegetarian: true },
        { id: id(), name: 'Egg Fried Rice', price: 3.80, allergens: [1, 3, 6, 11], vegetarian: true },
        { id: id(), name: 'Fried Noodles', price: 4.80, allergens: [1, 6, 11, 14] },
        { id: id(), name: 'Salt & Chilli Chips', price: 5.50, allergens: [1, 6, 11, 14] },
        { id: id(), name: 'Stir Fried Vegetables', price: 4.80, allergens: [1, 6, 11, 14], vegetarian: true },
        { id: id(), name: 'Stir Fried Mushrooms', price: 4.80, allergens: [1, 6, 11, 14], vegetarian: true },
        { id: id(), name: 'Stir Fried Onions', price: 4.80, allergens: [1, 6, 11, 14], vegetarian: true },
        { id: id(), name: 'Stir Fried Beansprouts', price: 4.80, allergens: [1, 6, 11, 14], vegetarian: true },
        { id: id(), name: 'Prawn Crackers', price: 2.50, allergens: [2] },
      ],
    },
    {
      name: 'Drinks',
      items: [
        { id: id(), name: 'Can', price: 2.00, allergens: [], drinkOptions: ['Coke', 'Coke Zero', 'Diet Coke', 'Fanta', 'Club Orange', '7up', '7up Free'], drinkPrefix: '' },
        { id: id(), name: 'Large Bottle', price: 4.50, allergens: [], drinkOptions: ['Coke', 'Coke Zero', 'Diet Coke', 'Fanta', 'Club Orange', '7up', '7up Free'], drinkPrefix: 'Large ' },
        { id: id(), name: 'Lucozade', price: 2.80, allergens: [] },
        { id: id(), name: 'Lucozade Sport', price: 2.80, allergens: [] },
        { id: id(), name: 'Monster', price: 3.00, allergens: [] },
        { id: id(), name: 'Red Bull', price: 3.00, allergens: [] },
        { id: id(), name: 'Mineral Water', price: 2.00, allergens: [] },
        { id: id(), name: 'Capri Sun', price: 1.20, allergens: [] },
      ],
    },
  ],
};

// API Routes
app.get('/api/menu', (req, res) => {
  res.json(menu);
});

app.post('/api/orders', (req, res) => {
  const { customerName, phone, address, items, notes, orderType } = req.body;

  if (!customerName || !phone || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const order = {
    id: orderIdCounter++,
    customerName,
    phone,
    address: address || '',
    items,
    notes: notes || '',
    orderType: orderType || 'collection',
    total: Math.round(total * 100) / 100,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  saveOrders(orders);
  res.status(201).json(order);
});

app.get('/api/orders', (req, res) => {
  const { date } = req.query;
  let result = orders;
  if (date) {
    result = orders.filter(o => o.createdAt.startsWith(date));
  }
  res.json(result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.patch('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = orders.find(o => o.id === parseInt(id));

  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = status;
  saveOrders(orders);
  res.json(order);
});

app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  orders = orders.filter(o => o.id !== parseInt(id));
  saveOrders(orders);
  res.status(204).send();
});

// --- Daily summary (end-of-night totals) ---
app.get('/api/summary/daily', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const dayOrders = orders.filter(o => o.createdAt.startsWith(date));

  const totalRevenue = dayOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = dayOrders.length;
  const byStatus = {};
  dayOrders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });

  const itemsSold = {};
  dayOrders.forEach(o => {
    o.items.forEach(item => {
      if (!itemsSold[item.name]) itemsSold[item.name] = { quantity: 0, revenue: 0 };
      itemsSold[item.name].quantity += item.quantity;
      itemsSold[item.name].revenue += item.price * item.quantity;
    });
  });

  const topItems = Object.entries(itemsSold)
    .map(([name, data]) => ({ name, ...data, revenue: Math.round(data.revenue * 100) / 100 }))
    .sort((a, b) => b.quantity - a.quantity);

  res.json({
    date,
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    byStatus,
    topItems,
  });
});

// --- Monthly per-item analytics ---
app.get('/api/analytics/monthly', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = req.query.month ? parseInt(req.query.month) : null;

  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  if (month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthOrders = orders.filter(o => o.createdAt.startsWith(prefix));
    const itemsSold = {};
    monthOrders.forEach(o => {
      o.items.forEach(item => {
        if (!itemsSold[item.name]) itemsSold[item.name] = { quantity: 0, revenue: 0 };
        itemsSold[item.name].quantity += item.quantity;
        itemsSold[item.name].revenue += item.price * item.quantity;
      });
    });
    const items = Object.entries(itemsSold)
      .map(([name, data]) => ({ name, ...data, revenue: Math.round(data.revenue * 100) / 100 }))
      .sort((a, b) => b.quantity - a.quantity);

    return res.json({
      year, month, monthName: monthNames[month - 1],
      totalOrders: monthOrders.length,
      totalRevenue: Math.round(monthOrders.reduce((s, o) => s + o.total, 0) * 100) / 100,
      items,
    });
  }

  // Return all 12 months overview
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const prefix = `${year}-${String(m).padStart(2, '0')}`;
    const monthOrders = orders.filter(o => o.createdAt.startsWith(prefix));
    const itemsSold = {};
    monthOrders.forEach(o => {
      o.items.forEach(item => {
        if (!itemsSold[item.name]) itemsSold[item.name] = { quantity: 0, revenue: 0 };
        itemsSold[item.name].quantity += item.quantity;
        itemsSold[item.name].revenue += item.price * item.quantity;
      });
    });
    const items = Object.entries(itemsSold)
      .map(([name, data]) => ({ name, ...data, revenue: Math.round(data.revenue * 100) / 100 }))
      .sort((a, b) => b.quantity - a.quantity);

    months.push({
      month: m, monthName: monthNames[m - 1],
      totalOrders: monthOrders.length,
      totalRevenue: Math.round(monthOrders.reduce((s, o) => s + o.total, 0) * 100) / 100,
      items,
    });
  }

  res.json({ year, months });
});

// --- Compare a specific item across months ---
app.get('/api/analytics/item', (req, res) => {
  const { name, year: yearParam } = req.query;
  const year = parseInt(yearParam) || new Date().getFullYear();
  if (!name) return res.status(400).json({ error: 'name query param required' });

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const breakdown = [];

  for (let m = 1; m <= 12; m++) {
    const prefix = `${year}-${String(m).padStart(2, '0')}`;
    const monthOrders = orders.filter(o => o.createdAt.startsWith(prefix));
    let qty = 0, rev = 0;
    monthOrders.forEach(o => {
      o.items.forEach(item => {
        if (item.name === name) { qty += item.quantity; rev += item.price * item.quantity; }
      });
    });
    breakdown.push({ month: m, monthName: monthNames[m - 1], quantity: qty, revenue: Math.round(rev * 100) / 100 });
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

  function countInRange(range) {
    const counts = {};
    orders.forEach(o => {
      const d = new Date(o.createdAt);
      if (d >= range.start && d <= range.end) {
        o.items.forEach(item => {
          counts[item.name] = (counts[item.name] || 0) + item.quantity;
        });
      }
    });
    return counts;
  }

  const currentCounts = countInRange(current);
  const previousCounts = countInRange(previous);

  // Collect all menu item names
  const allItems = [];
  menu.sections.forEach(section => {
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
});
