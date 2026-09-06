# BlueRock Bank 🏦

A full-stack **banking system website** with a customer portal and a separate admin panel — accounts, deposits, withdrawals, inter-account transfers by account number, transaction history, and an account-application workflow with admin approval.

Built as a self-contained demo project: no external services required, everything runs locally with seeded demo data.

---

## Tech Stack

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![better-sqlite3](https://img.shields.io/badge/better--sqlite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | [Node.js](https://nodejs.org/) | JavaScript server runtime |
| Framework | [Express](https://expressjs.com/) | REST API + static file serving |
| Database | [SQLite](https://www.sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Persistent, file-based storage (`data/bank.db`) — survives restarts |
| Auth | [express-session](https://github.com/expressjs/session) + Node `crypto.scrypt` | Cookie sessions, salted password hashing, role-based access |
| Frontend | Vanilla HTML / CSS / JavaScript | Zero build step — pages served directly by Express |

## Features

### Customer Portal (`/`)
- **Separate login panel** for customers (admins have their own panel at `/admin`)
- Dashboard with account cards, balances, and recent activity
- **Deposits & withdrawals** via modal dialogs, with validation (positive amounts, no overdraft, ₹1,00,000 single-deposit cap)
- **Transfers by account number** — send money to any BlueRock account; atomic SQL transaction so money never vanishes mid-transfer
- **Account applications** — customers *apply* for new savings/checking accounts; nothing is created until an admin approves
- Application status tracking (pending / approved / rejected with reason)
- Paginated, filterable transaction history

### Admin Panel (`/admin`)
- Dark "staff access only" login, separate from the customer portal
- Overview stats: customers, accounts, pending applications, total deposits/withdrawals/transfers, bank-wide balance
- **Applications tab** — approve (creates the account) or reject (with reason) customer applications; pending count badge
- Customer management — list all customers with account counts and total balances; create new customers (auto-opens their first account)
- All accounts and all bank-wide transactions with pagination

### Security
- Role-based route guards (`requireLogin`, `requireAdmin`) on every API endpoint
- Per-account ownership checks — users can only access their own accounts
- scrypt password hashing with per-user salts
- Transfers validated: sufficient funds, destination exists, no self-transfers

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Seed the database with demo users, accounts and transactions
npm run seed

# 3. Start the server
npm start
```

Then open:
- **Customer portal:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin

### Demo Logins

| Role | Username | Password | Panel |
|---|---|---|---|
| Admin | `admin` | `admin123` | `/admin` |
| Customer | `john` | `john123` | `/` |
| Customer | `alice` | `alice123` | `/` |
| Customer | `raj` | `raj123` | `/` |

> Customer credentials are rejected on the admin panel and vice-versa.

## Project Structure

```
banking-system/
├── src/
│   ├── server.js     # Express app — all API routes + static serving
│   ├── db.js         # SQLite connection + schema (users, accounts, transactions, applications)
│   ├── auth.js       # Password hashing, account numbers, atomic transfer logic
│   └── seed.js       # Demo data seeder
├── public/
│   ├── index.html            # Customer login
│   ├── admin-login.html      # Admin login (separate panel)
│   ├── dashboard.html        # Customer dashboard + deposit/withdraw modals
│   ├── transfer.html         # Transfer by account number
│   ├── transactions.html     # Customer transaction history
│   ├── admin.html            # Admin panel (overview/customers/accounts/transactions/applications)
│   ├── css/style.css         # Shared styles
│   └── js/app.js             # Shared helpers (api fetch, auth guards, navbar, formatting)
├── test-browser.js   # Headless-Chrome end-to-end tests (puppeteer-core)
├── data/bank.db      # SQLite database (gitignored, created by `npm run seed`)
└── package.json
```

## API Overview

| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /api/login` | — | Customer login (customers only) |
| `POST /api/admin/login` | — | Admin login (admins only) |
| `POST /api/logout` / `GET /api/me` | session | Logout / current user |
| `GET /api/accounts` | customer | List own accounts |
| `POST /api/accounts/:id/deposit` \| `/withdraw` | customer | Deposit / withdraw |
| `POST /api/transfer` | customer | Transfer by destination account number |
| `GET /api/accounts/:id/transactions` | customer | Paginated history |
| `POST /api/applications` / `GET /api/applications` | customer | Apply for / list own account applications |
| `GET /api/admin/stats` \| `/customers` \| `/accounts` \| `/transactions` \| `/applications` | admin | Admin data |
| `POST /api/admin/customers` | admin | Create customer (auto-opens first account) |
| `POST /api/admin/applications/:id/approve` \| `/reject` | admin | Approve / reject applications |

## Testing

```bash
node test-browser.js   # headless Chrome E2E: login, deposit, withdraw, apply, admin approve
```

## License

[MIT License](./LICENSE) — Copyright (c) 2026 Hrishikesh Thombare.
