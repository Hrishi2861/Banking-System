import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, radiusSm, shadow } from './theme';
import { login, logout, me, initServerUrl } from './api';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import TransferScreen from './screens/TransferScreen';
import HistoryScreen from './screens/HistoryScreen';
import ApplicationsScreen from './screens/ApplicationsScreen';

// Lightweight tab navigation (no react-navigation dependency — keeps the
// Expo Go install minimal; five screens don't warrant a nav library).
// The navbar mirrors the site's: navy bar, gradient logo, slate links,
// bordered outline logout button.
const TABS = [
  { key: 'dashboard', title: 'Dashboard' },
  { key: 'transfer', title: 'Transfer' },
  { key: 'history', title: 'History' },
  { key: 'applications', title: 'Apply' }
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);       // null = logged out
  const [tab, setTab] = useState('dashboard');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      await initServerUrl();
      try {
        const u = await me();
        if (u.role !== 'admin') setUser(u); // customer sessions only
      } catch {}
      setReady(true);
    })();
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    setTab('dashboard');
    setReloadKey((k) => k + 1);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  // Remount active screen after money moves so balances refresh everywhere.
  const refresh = () => setReloadKey((k) => k + 1);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.brand}>
          <LinearGradient
            colors={['#60a5fa', colors.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <Text style={styles.logoText}>B</Text>
          </LinearGradient>
          <Text style={styles.brandName}>BlueRock Bank</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.userName} numberOfLines={1}>{user.full_name}</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        key={tab + reloadKey}
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'dashboard' && <DashboardScreen user={user} onChanged={refresh} />}
        {tab === 'transfer' && <TransferScreen onChanged={refresh} />}
        {tab === 'history' && <HistoryScreen />}
        {tab === 'applications' && <ApplicationsScreen />}
      </ScrollView>

      <View style={styles.tabbar}>
        {TABS.map(({ key, title }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.navy,
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  brand: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    width: 30, height: 30, borderRadius: radiusSm,
    alignItems: 'center', justifyContent: 'center'
  },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  brandName: { color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: 10, letterSpacing: 0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  userName: { color: colors.slate, fontSize: 14, marginRight: 12, maxWidth: 110 },
  logoutBtn: {
    borderWidth: 1, borderColor: colors.slate2, borderRadius: radiusSm,
    paddingHorizontal: 14, paddingVertical: 6
  },
  logoutText: { color: colors.border, fontSize: 13 },
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 40 },
  tabbar: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.border
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.blue },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.blue }
});
