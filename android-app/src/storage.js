import AsyncStorage from '@react-native-async-storage/async-storage';

// Two server options, per the deployment plan in the repo UPDATES.md:
//   cloud — the VPS-deployed instance (default)
//   lan   — a dev machine on the local Wi-Fi
// The active choice plus both URLs are stored, so switching servers
// (or repointing either one) needs no rebuild.
const KEY = '@bluerock/servers';

export const DEFAULTS = {
  cloud: 'http://169.58.66.151:3000', // VPS deployment
  lan: 'http://192.168.1.42:3000'     // dev machine on local Wi-Fi
};

export async function getServers() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

export async function saveServers({ cloud, lan }) {
  const s = await getServers();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...s, cloud: normalizeUrl(cloud), lan: normalizeUrl(lan) }));
}

// Normalise: ensure http(s) scheme, no trailing slash.
export function normalizeUrl(url) {
  let v = String(url || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'http://' + v;
  return v.replace(/\/+$/, '');
}

// ---- convenience wrappers used by api.js ----

export async function getActiveServer() {
  const s = await getServers();
  return { url: s.active === 'lan' ? s.lan : s.cloud, active: s.active || 'cloud', ...s };
}

export async function setActiveServer(which) {
  const s = await getServers();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...s, active: which === 'lan' ? 'lan' : 'cloud' }));
}
