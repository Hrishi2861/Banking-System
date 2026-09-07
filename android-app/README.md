# BlueRock Bank — Android App 📱

React Native (Expo) client for the BlueRock Bank Express API, per the plan in the repo root [`UPDATES.md`](../UPDATES.md).

## Install the APK (no build needed)

Download straight from the deployed server:

**http://169.58.66.151:3000/downloads/BlueRockBank.apk**

On the phone: open the link in a browser → allow the download → tap to install → allow "install unknown apps" when Android asks. The APK is signed with the project's release keystore.

## Architecture

- **No duplicated business logic** — every money movement happens server-side; the app is a thin client over the same REST API the web portal uses (`/api/*` in `src/server.js`).
- **Cookie sessions** are kept by React Native's `fetch` (cookies persist per app process), matching the web client's auth flow.
- **Two server options, switchable in-app** — on the login screen tap **⚙ Server** and pick:
  - **☁ Cloud (VPS)** — default, `http://169.58.66.151:3000`
  - **🏠 LAN** — a dev machine on the same Wi-Fi (edit the URL to its LAN IP)
  Both URLs are editable and stored with AsyncStorage; switching needs no rebuild.

## Running from source (LAN development)

1. **Start the backend** on the dev machine (same Wi-Fi as the phone):

   ```bash
   cd .. && npm install && npm run seed && npm start   # http://<LAN-IP>:3000
   ```

2. **Install Expo Go** on the Android phone (Play Store), then:

   ```bash
   cd android-app
   npm install --legacy-peer-deps
   npx expo start        # scan the QR code with Expo Go
   ```

3. In the app's ⚙ Server settings pick **LAN** and point it at `http://<dev-machine-LAN-IP>:3000`.

## Building the APK from source

```bash
cd android-app
npm install --legacy-peer-deps
npx expo prebuild -p android --no-install   # generates ./android (once)
cd android
ANDROID_HOME=/opt/android-sdk ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

Release signing uses the keystore at `/root/APK-Signature/hrishi.jks` (alias `key0`). Its credentials live in `android/keystore.properties` — **gitignored, keep it only on the build machine**; copy the pattern from `android/app/build.gradle`. Without that file, release builds fall back to debug signing. Copy the built APK to `../public/downloads/BlueRockBank.apk` in the repo root so the server serves it.

> **Cleartext HTTP:** the app talks plain HTTP to both server options (`usesCleartextTraffic="true"` in the manifest). Switch to HTTPS before any production-grade deployment (see UPDATES.md).

## Features

Full parity with the customer portal:

- Login / logout (customer sessions)
- Dashboard: navy-gradient account cards, balances, recent activity with type badges
- Deposits & withdrawals (server-side validation: positive amounts, no overdraft, ₹1,00,000 single-deposit cap)
- Transfers by account number (atomic, server-side)
- Account applications (savings/checking) + status tracking with site-matching badges
- Paginated, filterable transaction history

Admin functions are web-only; the app is customer-facing, matching the product split (admin panel at `/admin`).

## Project layout

```
android-app/
  app.json          Expo config (name, splash, android package, cleartext)
  index.js          Expo entry point
  android/          Generated native project (expo prebuild) — Gradle APK build
  src/
    App.js          Root component + tab navigation (site-style navbar)
    api.js          fetch wrapper (session cookies, active server URL)
    storage.js      Cloud/LAN server URLs + active choice (AsyncStorage)
    theme.js        Brand palette (mirrors public/css/style.css)
    screens/        Login, Dashboard, Transfer, History, Applications
```
