// fetch wrapper for the BlueRock Bank REST API.
//
// Sessions are cookie-based (express-session). React Native's fetch keeps
// cookies per app process automatically, so a Set-Cookie from /api/login
// is sent back on subsequent calls — same as the web client's
// credentials: 'same-origin'.
//
// Base URL is the *active* server of two options (cloud VPS / LAN dev
// machine), selectable in the login screen's settings — see storage.js.

import { getActiveServer } from './storage';

let serverUrlCache = null;

export async function initServerUrl() {
  const s = await getActiveServer();
  serverUrlCache = s.url;
  return serverUrlCache;
}

export function getBaseUrl() {
  return serverUrlCache || '';
}

export async function api(path, opts = {}) {
  if (!serverUrlCache) await initServerUrl();
  const res = await fetch(serverUrlCache + '/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function login(username, password) {
  return api('/login', { method: 'POST', body: { username, password } });
}

export async function logout() {
  try {
    await api('/logout', { method: 'POST' });
  } catch {} // Logging out locally even if the call fails.
}

export async function me() {
  return api('/me');
}
