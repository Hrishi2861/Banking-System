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

### Future: Public Deployment

> **Update (2026-09-07): deployed.** The server now runs on a VPS at **http://169.58.66.151:3000** under pm2 (`bluerock-bank`), with login rate limiting in place (10 attempts / 15 min / IP via `express-rate-limit`). Port 80/443 are occupied by the mailcow stack on that machine, so the bank stays on port 3000 (also allowed in ufw). Same instance serves LAN clients too — one server, both app options. HTTPS still requires a domain (see below) — currently plain HTTP by decision.

When the project needs to be reachable beyond the home network:

1. Deploy to a VPS with a process manager (`pm2` or `systemd`) ✅ done — pm2
2. Put it behind a reverse proxy (nginx/Caddy) with **HTTPS** — required for production and for a future PWA — pending (needs a domain; mailcow holds 80/443 on this box)
3. Restrict CORS/cookies: set `secure: true` and `sameSite` appropriately on the session cookie in `src/server.js` — pending HTTPS
4. Add rate limiting on the login endpoints (e.g. `express-rate-limit`) ✅ done

---

## 📱 Android App (Built — APK available)

A React Native (Expo) client reusing the existing REST API, built exactly per the decisions below. **The signed release APK is built and served by the bank itself:**

**http://169.58.66.151:3000/downloads/BlueRockBank.apk**

> **Update (2026-09-07) — v1.2.0:** the app now ships with a custom **BlueRock-branded launcher icon** — adaptive icon with foreground/background layers plus a themed **monochrome** variant (Android 13+) across all densities, replacing the default Expo icon. The signed APK was rebuilt with the new icon and re-released (`v1.2.0` on GitHub Releases; the server copy above refreshed).

- Built locally on the VPS (Android SDK at `/opt/android-sdk`, `expo prebuild` + `gradlew assembleRelease`, ~10 min).
- Signed with the release keystore (`/root/APK-Signature/hrishi.jks`, alias `key0`); credentials live in the **gitignored** `android-app/android/keystore.properties`, read by `android/app/build.gradle` (falls back to debug signing without it).
- Install: open the link on the phone, download, allow "install unknown apps".
- The app offers **two server options** on its login screen (⚙ Server): **☁ Cloud (VPS)** — default, `http://169.58.66.151:3000` — or **🏠 LAN** (editable URL), both stored in AsyncStorage. One backend instance serves both.

### What's implemented

Full feature parity with the customer portal (admin stays web-only, matching the product split):

- Customer login / logout (cookie sessions via RN fetch), with cloud/LAN server picker
- Dashboard: navy-gradient account cards, deposits & withdrawals via modals (server-side validation surfaced as errors)
- Transfers by account number
- Paginated, filterable transaction history with type badges
- Account applications + status tracking (pending/approved/rejected badges)

Theme mirrors the web portal exactly — palette from `public/css/style.css`, navy gradient account cards, pill badges, uppercase card headings, gradient logo, login screen matching `index.html` (navy backdrop, white card, demo-credentials box).

### How to run from source (LAN development)

```bash
cd android-app && npm install --legacy-peer-deps
npx expo start          # scan the QR code with Expo Go (Play Store) on the same Wi-Fi
```

The backend must be running first (`npm start` in the repo root). In the app's ⚙ Server settings pick **LAN** and set the dev machine's address.

### Decisions

| Question | Decision |
|---|---|
| Framework | **React Native** (JavaScript — matches the existing Node.js backend and skillset; Flutter/Dart was the alternative) |
| Expo vs bare RN | **Expo** — Expo Go for development; `expo prebuild` + Gradle for the release APK |
| Backend | Reuse this Express API **as-is** — it already provides every feature through JSON endpoints |
| Server access | **Two in-app options:** Cloud (VPS, default) or LAN — both URLs editable, stored in AsyncStorage, switching needs no rebuild |
| Auth | Cookie sessions work in React Native via `fetch` (cookies persist per app process), matching the web client's flow |
| Navigation | Lightweight tab switcher in `src/App.js` — no react-navigation dependency, keeping the Expo Go footprint minimal |

### Design Notes

- **Cleartext HTTP:** `android:usesCleartextTraffic="true"` in the manifest (set in `android-app/android/app/src/main/AndroidManifest.xml`) — required while both server options are plain HTTP. Must be removed when switching to production HTTPS.
- **Atomic operations:** all money movement stays server-side — the app only calls the API, so transaction-safety guarantees are unchanged.
