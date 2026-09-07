import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, radiusSm, shadow, fmtMoney } from '../theme';
import { api } from '../api';

// Mirrors transfer.html: white form card, muted uppercase labels,
// blue submit button. Transfer by account number — same server-side
// flow as the web portal: atomic SQL transaction, destination lookup,
// no self-transfers. The app never computes balances.

export default function TransferScreen({ onChanged }) {
  const [accounts, setAccounts] = useState(null);
  const [fromId, setFromId] = useState(null);
  const [toNumber, setToNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api('/accounts').then((accs) => {
      setAccounts(accs);
      if (accs.length) setFromId(accs[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  const submit = async () => {
    setSuccess('');
    const n = Number(amount);
    if (!fromId) { setError('Select a source account'); return; }
    if (!toNumber.trim()) { setError('Destination account number required'); return; }
    if (!n || n <= 0) { setError('Enter a positive amount'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await api('/transfer', {
        method: 'POST',
        body: {
          from_account_id: fromId,
          to_account_number: toNumber.trim(),
          amount: n,
          description: description.trim() || undefined
        }
      });
      setSuccess(`Transfer complete. New balance: ${fmtMoney(res.from_balance)}`);
      setToNumber('');
      setAmount('');
      setDescription('');
      onChanged && onChanged();
    } catch (e) {
      setError(e.message);
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
          <Text style={styles.emptyText}>You need an account before you can transfer.</Text>
        </View>
      </View>
    );
  }

  const selected = accounts.find((a) => a.id === fromId);

  return (
    <View>
      <Text style={styles.pageTitle}>Transfer</Text>

      <View style={styles.card}>
        <Text style={styles.label}>From account</Text>
        <View style={styles.pickerRow}>
          {accounts.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.pickerChip, fromId === a.id && styles.pickerChipActive]}
              onPress={() => setFromId(a.id)}
            >
              <Text style={[styles.pickerChipText, fromId === a.id && styles.pickerChipTextActive]}>
                {a.account_type} #{a.account_number}
              </Text>
              <Text style={[styles.pickerChipBalance, fromId === a.id && styles.pickerChipTextActive]}>
                {fmtMoney(a.balance)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>To account number</Text>
          <TextInput
            style={styles.input}
            value={toNumber}
            onChangeText={setToNumber}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. 10234567"
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.muted}
          />
          {selected && <Text style={styles.hint}>Available: {fmtMoney(selected.balance)}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Rent"
            placeholderTextColor={colors.muted}
          />
        </View>

        {error ? (
          <View style={styles.msgError}><Text style={styles.msgErrorText}>{error}</Text></View>
        ) : null}
        {success ? (
          <View style={styles.msgSuccess}><Text style={styles.msgSuccessText}>{success}</Text></View>
        ) : null}

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Money</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 18 },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 22, ...shadow },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: colors.card, borderRadius: radius,
    borderWidth: 1, borderColor: colors.border, padding: 22, ...shadow
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  field: { marginBottom: 16 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  pickerChip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radiusSm,
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8,
    backgroundColor: colors.bg
  },
  pickerChipActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  pickerChipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  pickerChipBalance: { color: colors.muted, fontSize: 12, marginTop: 2 },
  pickerChipTextActive: { color: colors.navy },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radiusSm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    color: colors.text, backgroundColor: '#fff'
  },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
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
  btn: {
    backgroundColor: colors.blue, borderRadius: radiusSm,
    alignItems: 'center', paddingVertical: 10
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 }
});
