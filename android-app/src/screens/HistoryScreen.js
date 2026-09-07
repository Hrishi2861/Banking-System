import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radius, radiusSm, shadow, fmtMoney, fmtDate } from '../theme';
import { api } from '../api';

// Mirrors transactions.html: white card with uppercase heading, account
// chips and type-filter chips, transaction rows with type badges and
// colored amounts, prev/next pagination — same /api endpoint and params
// as the web page.

const TYPES = [
  { value: '', label: 'All' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'transfer', label: 'Transfers' }
];

export default function HistoryScreen() {
  const [accounts, setAccounts] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null); // { transactions, page, total_pages }
  const [error, setError] = useState('');

  useEffect(() => {
    api('/accounts').then((accs) => {
      setAccounts(accs);
      if (accs.length) setAccountId(accs[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (accountId == null) return;
    setError('');
    setData(null);
    const params = { page: String(page), limit: '20' };
    if (type === 'transfer') {
      // Server filters by exact type; the "Transfers" chip shows both
      // directions, so fetch unfiltered and match client-side.
      api(`/accounts/${accountId}/transactions?${new URLSearchParams(params)}`)
        .then((d) => setData(d))
        .catch((e) => setError(e.message));
    } else {
      const p = { ...params };
      if (type) p.type = type;
      api(`/accounts/${accountId}/transactions?${new URLSearchParams(p)}`)
        .then((d) => setData(d))
        .catch((e) => setError(e.message));
    }
  }, [accountId, type, page]);

  if (accounts === null) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  if (!accounts.length) {
    return <View style={styles.center}><Text style={styles.emptyText}>No accounts yet.</Text></View>;
  }

  const visible = data
    ? (type === 'transfer'
        ? data.transactions.filter((t) => t.type === 'transfer_in' || t.type === 'transfer_out')
        : data.transactions)
    : [];

  return (
    <View>
      <Text style={styles.pageTitle}>Transaction History</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountRow}>
        {accounts.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.chip, accountId === a.id && styles.chipActive]}
            onPress={() => { setAccountId(a.id); setPage(1); }}
          >
            <Text style={[styles.chipText, accountId === a.id && styles.chipTextActive]}>
              {a.account_type} #{a.account_number}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.filterRow}>
        {TYPES.map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            style={[styles.chip, type === value && styles.chipActive]}
            onPress={() => { setType(value); setPage(1); }}
          >
            <Text style={[styles.chipText, type === value && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.msgError}><Text style={styles.msgErrorText}>{error}</Text></View>
      ) : null}

      {data === null && !error && (
        <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>
      )}

      {data && visible.length === 0 && !error && (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Transactions</Text>
          <Text style={styles.emptyText}>No transactions found.</Text>
        </View>
      )}

      {data && visible.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Transactions</Text>
          {visible.map((t) => (
            <View key={t.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <View style={[styles.badge, badgeStyle(t.type)]}>
                  <Text style={[styles.badgeText, badgeTextStyle(t.type)]}>
                    {t.type.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={styles.txDesc} numberOfLines={1}>{t.description}</Text>
                <Text style={styles.txDate}>{fmtDate(t.created_at)}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, t.type === 'deposit' ? styles.txIn : styles.txOut]}>
                  {t.type === 'deposit' ? '+' : '−'} {fmtMoney(t.amount)}
                </Text>
                <Text style={styles.txBalanceAfter}>Bal: {fmtMoney(t.balance_after)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {data && data.total_pages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            disabled={page <= 1}
            onPress={() => setPage((p) => p - 1)}
          >
            <Text style={styles.pageBtnText}>‹ Prev</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>Page {data.page} of {data.total_pages}</Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= data.total_pages && styles.pageBtnDisabled]}
            disabled={page >= data.total_pages}
            onPress={() => setPage((p) => p + 1)}
          >
            <Text style={styles.pageBtnText}>Next ›</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Badge colors straight from style.css (.badge.deposit etc.)
function badgeStyle(type) {
  if (type === 'deposit' || type === 'transfer_in') return { backgroundColor: colors.greenSoft };
  if (type === 'withdrawal' || type === 'transfer_out') return { backgroundColor: colors.redSoft };
  return { backgroundColor: colors.border };
}

function badgeTextStyle(type) {
  if (type === 'deposit' || type === 'transfer_in') return { color: colors.green };
  return { color: colors.red };
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 18 },
  accountRow: { flexDirection: 'row', marginBottom: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8,
    backgroundColor: colors.card
  },
  chipActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.navy },
  card: {
    backgroundColor: colors.card, borderRadius: radius,
    borderWidth: 1, borderColor: colors.border, padding: 22, ...shadow
  },
  cardHeading: {
    fontSize: 15, color: colors.muted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6
  },
  emptyText: { color: colors.muted, fontSize: 14, paddingVertical: 10 },
  msgError: {
    backgroundColor: colors.redSoft, borderRadius: radiusSm,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14
  },
  msgErrorText: { color: colors.red, fontSize: 14 },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border
  },
  txLeft: { flex: 1, paddingRight: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  txDesc: { fontSize: 13, color: colors.text, marginTop: 5 },
  txDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '600' },
  txIn: { color: colors.green },
  txOut: { color: colors.red },
  txBalanceAfter: { fontSize: 11, color: colors.muted, marginTop: 2 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 12 },
  pageBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radiusSm,
    paddingHorizontal: 14, paddingVertical: 8
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { color: colors.blue, fontWeight: '600', fontSize: 13 },
  pageInfo: { color: colors.muted, fontSize: 14 }
});
