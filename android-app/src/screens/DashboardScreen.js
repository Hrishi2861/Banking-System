import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, radiusSm, radiusLg, shadow, shadowDeep, fmtMoney, fmtDate } from '../theme';
import { api } from '../api';

// Mirrors dashboard.html: navy gradient account cards (uppercase light-blue
// type label, monospace account number, large white balance), deposit /
// withdraw buttons in soft green / soft red pill style, recent activity
// rows with colored amounts. All money movement is server-side; API
// validation errors (positive amounts, no overdraft, ₹1,00,000 cap)
// surface in the modal, exactly like the web form.

export default function DashboardScreen({ user, onChanged }) {
  const [accounts, setAccounts] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { account, action: 'deposit'|'withdraw' }
  const [amount, setAmount] = useState('');
  const [modalError, setModalError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const accs = await api('/accounts');
      setAccounts(accs);
      if (accs.length) {
        const { transactions } = await api(`/accounts/${accs[0].id}/transactions?limit=5`);
        setRecent(transactions);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = (account, action) => {
    setAmount('');
    setModalError('');
    setModal({ account, action });
  };

  const submitModal = async () => {
    const { account, action } = modal;
    const n = Number(amount);
    if (!n || n <= 0) { setModalError('Enter a positive amount'); return; }
    setBusy(true);
    setModalError('');
    try {
      await api(`/accounts/${account.id}/${action === 'deposit' ? 'deposit' : 'withdraw'}`, {
        method: 'POST',
        body: { amount: n }
      });
      setModal(null);
      await load();
      onChanged && onChanged();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (accounts === null) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  if (!accounts.length) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No accounts yet</Text>
          <Text style={styles.emptyText}>Apply for a savings or checking account from the Apply tab.</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.pageTitle}>Welcome back, {user.full_name.split(' ')[0]}</Text>

      {accounts.map((a) => (
        <LinearGradient
          key={a.id}
          colors={[colors.navy, colors.navy2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.accountCard}
        >
          <Text style={styles.accType}>{a.account_type}</Text>
          <Text style={styles.accNumber}>#{a.account_number}</Text>
          <Text style={styles.accBalance}>{fmtMoney(a.balance)}</Text>
          <Text style={styles.accLabel}>Available balance</Text>
          <View style={styles.accActions}>
            <TouchableOpacity
              style={[styles.accBtn, styles.accBtnDeposit]}
              onPress={() => openModal(a, 'deposit')}
            >
              <Text style={styles.accBtnTextDeposit}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.accBtn, styles.accBtnWithdraw]}
              onPress={() => openModal(a, 'withdraw')}
            >
              <Text style={styles.accBtnTextWithdraw}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      ))}

      <View style={styles.card}>
        <Text style={styles.cardHeading}>Recent activity</Text>
        {recent.length === 0 && <Text style={styles.emptyText}>No transactions yet.</Text>}
        {recent.map((t) => (
          <View key={t.id} style={styles.txRow}>
            <View style={styles.txLeft}>
              <View style={styles.txTopRow}>
                <View style={[styles.badge, badgeStyle(t.type)]}>
                  <Text style={[styles.badgeText, badgeTextStyle(t.type)]}>
                    {t.type.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.txDesc} numberOfLines={1}>{t.description}</Text>
              <Text style={styles.txDate}>{fmtDate(t.created_at)}</Text>
            </View>
            <Text style={[styles.txAmount, t.type === 'deposit' ? styles.txIn : styles.txOut]}>
              {t.type === 'deposit' ? '+' : '−'} {fmtMoney(t.amount)}
            </Text>
          </View>
        ))}
      </View>

      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {modal?.action === 'deposit' ? 'Deposit to' : 'Withdraw from'} {modal?.account.account_type} #{modal?.account.account_number}
            </Text>
            <Text style={styles.modalBalance}>Balance: {fmtMoney(modal?.account.balance)}</Text>
            <View style={styles.modalField}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.muted}
              />
            </View>
            {modalError ? (
              <View style={styles.msgError}>
                <Text style={styles.msgErrorText}>{modalError}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModal(null)}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSubmit} onPress={submitModal} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Badge colors straight from style.css (.badge.deposit etc.)
function badgeStyle(type) {
  if (type === 'deposit') return { backgroundColor: colors.greenSoft };
  if (type === 'withdrawal' || type === 'transfer_out') return { backgroundColor: colors.redSoft };
  if (type === 'transfer_in') return { backgroundColor: colors.greenSoft };
  return { backgroundColor: colors.border };
}

function badgeTextStyle(type) {
  if (type === 'deposit' || type === 'transfer_in') return { color: colors.green };
  return { color: colors.red };
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 18 },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 22, ...shadow },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  accountCard: {
    borderRadius: radius, padding: 22, marginBottom: 18, ...shadow
  },
  accType: {
    textTransform: 'uppercase', fontSize: 12, letterSpacing: 1,
    color: colors.blueSoftText, marginBottom: 6, fontWeight: '600'
  },
  accNumber: { fontSize: 14, color: colors.slate, marginBottom: 14, fontFamily: 'monospace' },
  accBalance: { fontSize: 30, fontWeight: '700', color: '#fff' },
  accLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  accActions: { flexDirection: 'row', flexWrap: 'wrap' },
  accBtn: {
    borderRadius: radiusSm, paddingVertical: 7, paddingHorizontal: 14,
    marginRight: 8, marginBottom: 8
  },
  accBtnDeposit: { backgroundColor: 'rgba(220, 252, 231, 0.15)' },
  accBtnWithdraw: { backgroundColor: 'rgba(254, 226, 226, 0.15)' },
  accBtnTextDeposit: { color: colors.greenSoft, fontWeight: '600', fontSize: 12 },
  accBtnTextWithdraw: { color: '#fca5a5', fontWeight: '600', fontSize: 12 },
  card: {
    backgroundColor: colors.card, borderRadius: radius,
    borderWidth: 1, borderColor: colors.border, padding: 22, ...shadow
  },
  cardHeading: {
    fontSize: 15, color: colors.muted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14
  },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border
  },
  txLeft: { flex: 1, paddingRight: 10 },
  txTopRow: { flexDirection: 'row' },
  badge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    alignSelf: 'flex-start'
  },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  txDesc: { fontSize: 13, color: colors.text, marginTop: 5 },
  txDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  txIn: { color: colors.green },
  txOut: { color: colors.red },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center', padding: 24
  },
  modal: {
    backgroundColor: colors.card, borderRadius: radiusLg, padding: 28, ...shadowDeep
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  modalBalance: { fontSize: 13, color: colors.muted, marginBottom: 14 },
  modalField: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radiusSm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    color: colors.text, backgroundColor: '#fff'
  },
  msgError: {
    backgroundColor: colors.redSoft, borderRadius: radiusSm,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6
  },
  msgErrorText: { color: colors.red, fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  btnCancel: {
    borderWidth: 1, borderColor: colors.slate2, borderRadius: radiusSm,
    paddingHorizontal: 18, paddingVertical: 10
  },
  btnCancelText: { color: colors.slate, fontWeight: '600', fontSize: 14 },
  btnSubmit: {
    backgroundColor: colors.blue, borderRadius: radiusSm,
    paddingHorizontal: 18, paddingVertical: 10
  },
  btnSubmitText: { color: '#fff', fontWeight: '600', fontSize: 14 }
});
