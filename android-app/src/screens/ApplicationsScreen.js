import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, radiusSm, shadow, fmtDate } from '../theme';
import { api } from '../api';

// Mirrors the applications part of dashboard.html: customers apply for a
// savings/checking account; an admin approves on the web panel, and only
// then is a real account created. Status badges use the site's colors
// (pending amber, approved green, rejected red).

export default function ApplicationsScreen() {
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api('/applications')
      .then(setApplications)
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  const apply = async (accountType) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api('/applications', { method: 'POST', body: { account_type: accountType } });
      setSuccess(`Application for a ${accountType} account submitted.`);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (applications === null) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  const pending = applications.filter((a) => a.status === 'pending');

  return (
    <View>
      <Text style={styles.pageTitle}>Account Applications</Text>
      <Text style={styles.pageSub}>Apply for a new account — an admin reviews each application.</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>New application</Text>
        <View style={styles.applyRow}>
          <TouchableOpacity
            style={[styles.btn, busy && styles.btnDisabled]}
            onPress={() => apply('savings')}
            disabled={busy || pending.some((a) => a.account_type === 'savings')}
          >
            <Text style={styles.btnText}>Apply for Savings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, busy && styles.btnDisabled]}
            onPress={() => apply('checking')}
            disabled={busy || pending.some((a) => a.account_type === 'checking')}
          >
            <Text style={styles.btnText}>Apply for Checking</Text>
          </TouchableOpacity>
        </View>
        {pending.some((a) => a.account_type === 'savings') && (
          <Text style={styles.hint}>You already have a pending savings application.</Text>
        )}
        {pending.some((a) => a.account_type === 'checking') && (
          <Text style={styles.hint}>You already have a pending checking application.</Text>
        )}
      </View>

      {error ? (
        <View style={styles.msgError}><Text style={styles.msgErrorText}>{error}</Text></View>
      ) : null}
      {success ? (
        <View style={styles.msgSuccess}><Text style={styles.msgSuccessText}>{success}</Text></View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardHeading}>Your applications</Text>
        {applications.length === 0 && <Text style={styles.emptyText}>No applications yet.</Text>}
        {applications.map((a) => (
          <View key={a.id} style={styles.appRow}>
            <View style={styles.appLeft}>
              <Text style={styles.appType}>{a.account_type}</Text>
              <Text style={styles.appDate}>Applied {fmtDate(a.created_at)}</Text>
              {a.status === 'rejected' && a.rejection_reason ? (
                <Text style={styles.appReason} numberOfLines={2}>Reason: {a.rejection_reason}</Text>
              ) : null}
              {a.status === 'approved' && a.decided_at ? (
                <Text style={styles.appReason}>Approved {fmtDate(a.decided_at)}</Text>
              ) : null}
            </View>
            <View style={[styles.badge, statusBadgeStyle(a.status)]}>
              <Text style={[styles.badgeText, statusBadgeTextStyle(a.status)]}>{a.status}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// Badge colors from style.css (.badge.pending / .approved / .rejected)
function statusBadgeStyle(status) {
  if (status === 'pending') return { backgroundColor: colors.amberSoft };
  if (status === 'approved') return { backgroundColor: colors.greenSoft };
  return { backgroundColor: colors.redSoft };
}

function statusBadgeTextStyle(status) {
  if (status === 'pending') return { color: colors.amber };
  if (status === 'approved') return { color: colors.green };
  return { color: colors.red };
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  pageSub: { color: colors.muted, fontSize: 14, marginBottom: 18 },
  card: {
    backgroundColor: colors.card, borderRadius: radius,
    borderWidth: 1, borderColor: colors.border, padding: 22, marginBottom: 16, ...shadow
  },
  cardHeading: {
    fontSize: 15, color: colors.muted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14
  },
  applyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    backgroundColor: colors.blue, borderRadius: radiusSm,
    paddingHorizontal: 16, paddingVertical: 10
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 10 },
  msgError: {
    backgroundColor: colors.redSoft, borderRadius: radiusSm,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14
  },
  msgErrorText: { color: colors.red, fontSize: 14 },
  msgSuccess: {
    backgroundColor: colors.greenSoft, borderRadius: radiusSm,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14
  },
  msgSuccessText: { color: colors.green, fontSize: 14 },
  emptyText: { color: colors.muted, fontSize: 14, paddingVertical: 6 },
  appRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border
  },
  appLeft: { flex: 1, paddingRight: 10 },
  appType: { fontSize: 14, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  appDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  appReason: { fontSize: 12, color: colors.muted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }
});
