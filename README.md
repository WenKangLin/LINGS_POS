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
- **Backend**: Express.js (Node.js)
- **Storage**: In-memory (resets on server restart)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/menu | Get full menu |
| POST | /api/orders | Place a new order |
| GET | /api/orders | Get all orders |
| PATCH | /api/orders/:id | Update order status |
| DELETE | /api/orders/:id | Delete an order |
