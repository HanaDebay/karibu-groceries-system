# Karibu Groceries LTD System

Karibu Groceries LTD System is a role-based inventory and sales platform for wholesale produce operations.  
It supports branch-level procurement, stock tracking, cash sales, credit sales, and credit payment collection with reporting dashboards for management.

## Tech Stack
- Vue.js (primary frontend)
- Node.js + Express (backend API)
- MongoDB + Mongoose (database)
- Swagger UI (API testing)

## Core Features
- Role-based access: Director, Manager, Sales Agent
- Procurement and stock management by branch
- Cash and credit sale recording
- Credit due-payment handling (partial/full payment)
- Sales, stock, and credit reporting dashboards
- Receipt printing for sales transactions

## Project Structure
- `backend/` API routes, controllers, models, middleware
- `frontend-vue/` Vue application (active frontend)
- `docs/` supporting documentation

## Getting Started
### 1) Install dependencies
```bash
npm install
npm --prefix frontend-vue install
```

### 2) Configure environment
Create/update `.env` in project root 
```env
DATABASE_URI=your_mongodb_connection_string
PORT=your_server_port
JWT_SECRET=your_secure_random_secret
```

### 3) Build Vue frontend
```bash
npm run build:vue
```

### 4) Start server
```bash
npm start
```

## Access URLs
- App (Vue): `http://localhost:7000/`
- Login: `http://localhost:7000/login`
- Swagger API docs: `http://localhost:7000/api-docs`

## NPM Scripts
- `npm start` - start backend server
- `npm run dev:vue` - run Vue dev server
- `npm run build:vue` - build Vue for production
- `npm run preview:vue` - preview Vue production build

## API Authentication
Most protected endpoints require Bearer token auth.
Use login endpoint first, then pass:
```http
Authorization: Bearer <token>
```

