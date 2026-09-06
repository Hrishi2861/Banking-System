# Updates & Roadmap

Ongoing notes about deployment options and planned work.

---

## 📡 Running the Server on LAN (Phone / Other Devices)

The Express server listens on **all network interfaces**, so any device on the same Wi-Fi network can use the banking site — no code changes needed.

### Steps

1. **Find this machine's LAN IP:**

   ```bash
   hostname -I        # e.g. 192.168.1.42
   ```

2. **Start the server:**

   ```bash
   npm start           # listens on port 3000 on all interfaces
   ```

3. **From the phone (same Wi-Fi), open:**

   - Customer portal: `http://<LAN-IP>:3000`
   - Admin panel: `http://<LAN-IP>:3000/admin`

   e.g. `http://192.168.1.42:3000`

### Notes & Gotchas

- **Firewall:** if the phone can't connect, allow port 3000:

  ```bash
  sudo ufw allow 3000
  ```

- **Server bind:** `app.listen(PORT)` binds to `0.0.0.0` by default. To restrict it to localhost-only, change it in `src/server.js` to `app.listen(PORT, '127.0.0.1', ...)`.
- **Sessions are per-device** — logging in on the phone does not log out the desktop, and vice-versa.
- **Plain HTTP is fine on LAN.** Before exposing the server to the internet, put it behind HTTPS (see below).

### Future: Public Deployment (planned)

When the project needs to be reachable beyond the home network:

1. Deploy to a VPS with a process manager (`pm2` or `systemd`)
2. Put it behind a reverse proxy (nginx/Caddy) with **HTTPS** — required for production and for a future PWA
3. Restrict CORS/cookies: set `secure: true` and `sameSite` appropriately on the session cookie in `src/server.js`
4. Add rate limiting on the login endpoints (e.g. `express-rate-limit`)

---

## 📱 Android App (Planned — Not Yet Started)

A native Android client is **planned** to reuse the existing REST API. No app code exists in this repository yet; this section records the decisions made so far.

### Decisions

| Question | Decision |
|---|---|
| Framework | **React Native** (JavaScript — matches the existing Node.js backend and skillset; Flutter/Dart was the alternative) |
| Backend | Reuse this Express API **as-is** — it already provides every feature through JSON endpoints |
| Server access | **LAN first, deploy later** — the app's base URL will be a configurable setting, so the same build works against a local dev server today and a deployed HTTPS server tomorrow |
| Auth | Cookie sessions work in React Native via `fetch` credentials, but a token-based flow (e.g. session token in a header) may be adopted for the app for better mobile-session handling |

### Planned Feature Parity (all current web features)

- Customer login (separate from admin) and logout
- Dashboard: account cards with balances
- Deposits and withdrawals
- **Transfers by account number**
- Transaction history (paginated, filterable)
- Account applications + status tracking
- Admin panel: stats, approve/reject applications, customers, accounts, transactions

### Design Notes

- **Base URL as a setting:** store the API base URL in app settings (default: the LAN IP of the dev machine), so switching between local development and a deployed server requires no rebuild.
- **Cleartext HTTP:** for LAN development the Android app will need `android:usesCleartextTraffic="true"` (or a network security config limited to the dev IP). This must be removed for production HTTPS.
- **Atomic operations:** all money movement stays server-side — the app only calls the API, so transaction-safety guarantees are unchanged.

### Why It Hasn't Been Built Yet

The current development machine isn't powerful enough to comfortably run the Android SDK/Gradle APK builds. The Android SDK is already installed locally, so the project can start as soon as a suitable build machine (or CI such as GitHub Actions) is available — the REST API contract in `src/server.js` is the complete spec the app needs.
