# Chinese Takeaway Order System

A self-contained Chinese takeaway ordering system with a customer-facing menu and a kitchen dashboard.

## Features

- **Customer Menu**: Browse categories, add items to cart, place orders with name/phone
- **Kitchen Dashboard**: View incoming orders, update status (Pending → Preparing → Ready → Collected)
- **Real-time Updates**: Kitchen view auto-refreshes every 5 seconds
- **Collection/Delivery**: Customers choose order type
- **Responsive**: Works on desktop and mobile

## Quick Start

```bash
# Install all dependencies
npm run install-all

# Start both server and client in development mode
npm run dev
```

The app will be available at:
- **Customer Menu**: http://localhost:5173
- **Kitchen View**: http://localhost:5173/kitchen
- **API Server**: http://localhost:3001

## Production Build

```bash
# Build the client
npm run build

# Run just the server (serves the built client)
npm run server
```

Then visit http://localhost:3001

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, React Router, Lucide Icons
- **Backend**: Express.js (Node.js 22.13+ — uses the built-in `node:sqlite` module)
- **Storage**: SQLite at `data/orders.db` (WAL mode). An existing `data/orders.json` is imported automatically on first start and renamed to `.migrated`.
- **Menu**: `server/menu.json` — edit prices/allergens there; the server reloads it automatically on save (or `POST /api/menu/reload`). If the JSON is invalid the previous menu is kept and the error is logged. Each item has `allergens` (ids from the `allergens` map); add `removable: [ids]` to flag allergens the kitchen can leave out on request, which the allergen filter shows as "ask kitchen" instead of "not available". Sections flagged `mainCourse: true` feed the main-course counter; the `modifiers` list is the set of chips shown when adding a dish.
- **Prices** are always resolved server-side from `menu.json`; the client only sends item ids and quantities. Delivery orders require an address.
- **Backups**: a snapshot of the DB is written to `data/backups/orders-YYYY-MM-DD.db` every night at 04:00 (last 30 kept). `POST /api/backup` writes one on demand.

## Allergen Filter

The "Avoid" bar at the top of the menu lets staff select one or more allergens a customer must avoid. Dishes containing them are tinted red; dishes where every matching allergen is marked `removable` are highlighted amber. Protein choices in Build Your Own and Chef's Specials carry their own allergens (e.g. King Prawn → Crustaceans) and are merged into the cart item.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/menu | Get full menu |
| POST | /api/orders | Place a new order |
| GET | /api/orders | Get all orders |
| PATCH | /api/orders/:id | Update order status |
| DELETE | /api/orders/:id | Delete an order |
