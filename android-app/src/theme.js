// Theme matching public/css/style.css — the exact palette, radii, and
// visual language of the web portal (login hero, navy account cards,
// pill badges, uppercase card headings) so the app feels like the site.

export const colors = {
  navy: '#0b2a4a',
  navy2: '#123c6b',
  blue: '#2563eb',
  blueDark: '#1d4ed8',
  blueSoft: '#dbeafe',
  blueSoftText: '#93c5fd',   // account-card .acc-type
  slate: '#cbd5e1',          // nav links / account numbers on navy
  slate2: '#475569',         // logout button border
  slate3: '#1e3a5f',         // logout hover / login gradient stop
  green: '#16a34a',
  greenSoft: '#dcfce7',
  red: '#dc2626',
  redSoft: '#fee2e2',
  amber: '#d97706',
  amberSoft: '#fef3c7',
  bg: '#f4f6fa',
  card: '#ffffff',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0'
};

export const radius = 12;       // --radius (cards)
export const radiusSm = 8;      // inputs/buttons
export const radiusLg = 16;     // login card / modals

// The site's card shadow (approximated for React Native elevation).
export const shadow = {
  shadowColor: '#0f172a',
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 1, height: 3 },
  elevation: 3
};

export const shadowDeep = {
  shadowColor: '#000',
  shadowOpacity: 0.3,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 20 },
  elevation: 12
};

// Background of the login screen: linear-gradient(135deg, navy, #1e3a5f, navy-2).
// React Native has no CSS gradients — layer navy and navy2 with opacity.
export const loginGradient = { from: colors.navy, via: colors.slate3, to: colors.navy2 };

// Indian-locale currency formatting, same as the web client (Intl 'en-IN').
export const fmtMoney = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

// Server timestamps are "YYYY-MM-DD HH:MM:SS" in UTC (SQLite datetime('now')).
export const fmtDate = (s) => {
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

// Monospace account numbers, like .acc-number on the web.
export const fmtAccount = (n) => String(n);
