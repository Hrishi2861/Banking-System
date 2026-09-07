# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-09-07

Custom branding for the Android app — new launcher icon and refreshed signed release.

### Added — Android App (`android-app/`)
- **Custom BlueRock launcher icon** replacing the default Expo icon: adaptive icon with dedicated foreground/background layers and a themed **monochrome** variant (Android 13+ themed icons), plus updated legacy `ic_launcher` / `ic_launcher_round` PNGs across all densities (`mdpi` → `xxxhdpi`)
- Signed release APK rebuilt with the new icon and released as **`BlueRockBank.apk`** (served by the server and on GitHub Releases)

## [1.1.0] — 2026-09-07

Deployment, mobile app, and public-exposure hardening.

### Added — Android App (`android-app/`)
- **React Native (Expo) customer app** with full feature parity to the web portal: login/logout, dashboard with deposit/withdraw modals, transfers by account number, paginated + filterable transaction history, and account applications with status tracking
- **Two server options in-app** — ☁ Cloud (VPS, default) or 🏠 LAN, both URLs editable and stored in AsyncStorage; switching servers requires no rebuild
- Theme mirrors the web portal exactly: same palette (`public/css/style.css`), navy-gradient account cards, gradient logo, pill badges, and a login screen matching `index.html` (navy backdrop, white card, demo-credentials box)
- **Signed release APK** built locally (`expo prebuild` + Gradle) and served by the bank at `/downloads/BlueRockBank.apk`; signing uses the release keystore configured in `android-app/android/app/build.gradle`

### Added — Deployment
- Server deployed on a VPS under **pm2** (survives reboots) at `http://169.58.66.151:3000` — one instance serves both public and LAN clients (binds all interfaces)
- Login endpoints rate-limited (10 attempts / 15 min / IP) via `express-rate-limit` before public exposure

### Security
- Brute-force protection on `POST /api/login` and `POST /api/admin/login` (HTTP 429 with friendly message)
- Session cookie kept `secure: false` / `sameSite: 'lax'` deliberately — plain HTTP by decision; HTTPS + cookie hardening pending a domain (tracked in UPDATES.md)

## [1.0.0] — 2026-09-06

First stable release.

### Added — Core Banking
- Customer portal with secure login (scrypt-hashed passwords, cookie sessions)
- Multi-account support (savings + checking) per customer
- Deposits and withdrawals with validation (positive amounts, no overdraft, ₹1,00,000 single-deposit cap)
- **Money transfers between any accounts by account number** — executed as a single atomic SQL transaction (debit + credit + both ledger entries)
- Per-account transaction ledger with running balances
- Paginated, filterable transaction history (all accounts or a single account)

### Added — Account Application Workflow
- Customers *apply* for new accounts instead of creating them directly
- Duplicate pending applications blocked per account type
- Admin **approval** creates the real account; admin **rejection** records a visible reason
- Customer-facing application status tracking (pending / approved / rejected)

### Added — Admin Panel
- Separate dark-themed admin login panel (`/admin`) — customer and admin credentials are rejected on each other's panels
- Overview dashboard: customers, accounts, pending applications, total deposits/withdrawals/transfers, bank-wide balance
- Applications tab with pending-count badge and approve/reject actions
- Customer list (account counts, total balances) and customer creation (auto-opens first account)
- Bank-wide accounts and transactions views with pagination

### Added — Security
- Role-based route guards (`requireLogin`, `requireAdmin`) on all API endpoints
- Per-account ownership checks — no cross-customer data access
- Session-based auth; admins and customers are routed to their own panels

### Added — Developer Experience
- SQLite database with WAL mode — all records persist across server restarts
- Demo data seeder (`npm run seed`) with 4 users, 5 accounts, transactions and sample applications
- Headless-Chrome end-to-end test suite (`test-browser.js`) covering login, deposit, withdraw, cancel, invalid input, application flow and admin approval

### Fixed
- CSS specificity bug where `.hidden` was overridden by later `display: flex` rules, leaving the deposit/withdraw modal permanently open and blocking all page clicks
- SQLite quoting bug in application approval (`datetime("now")` → `datetime('now')`)
