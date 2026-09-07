import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radiusLg, radiusSm, shadowDeep } from '../theme';
import { login } from '../api';
import { getServers, saveServers, setActiveServer, normalizeUrl } from '../storage';

// Mirrors public/index.html: navy gradient backdrop, white login card,
// gradient logo, demo-credentials box. Server settings offer the two
// deployment options — cloud (VPS, default) or LAN dev machine.

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [active, setActive] = useState('cloud');
  const [cloudUrl, setCloudUrl] = useState('');
  const [lanUrl, setLanUrl] = useState('');

  React.useEffect(() => {
    getServers().then((s) => {
      setCloudUrl(s.cloud);
      setLanUrl(s.lan);
      setActive(s.active === 'lan' ? 'lan' : 'cloud');
    });
  }, []);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError('Enter your username and password');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const user = await login(username.trim(), password);
      if (user.role === 'admin') {
        setError('Admin accounts must use the web admin panel.');
      } else {
        onLogin(user);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const pick = async (which) => {
    setActive(which);
    await setActiveServer(which);
  };

  const saveUrls = async () => {
    await saveServers({ cloud: cloudUrl, lan: lanUrl });
    setShowSettings(false);
  };

  return (
    <LinearGradient
      colors={[colors.navy, colors.slate3, colors.navy2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.brandRow}>
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
            <Text style={styles.tagline}>Customer Portal — sign in to your accounts</Text>

            {error ? (
              <View style={styles.msgError}>
                <Text style={styles.msgErrorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="e.g. john"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
              />
            </View>

            <TouchableOpacity style={styles.btn} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
            </TouchableOpacity>

            <View style={styles.demoCreds}>
              <Text style={styles.demoCredsTitle}>Demo customer logins</Text>
              <Text style={styles.demoCredsText}>
                <Text style={styles.code}>john / john123</Text>   <Text style={styles.code}>alice / alice123</Text>   <Text style={styles.code}>raj / raj123</Text>
              </Text>
            </View>

            <TouchableOpacity style={styles.settingsToggle} onPress={() => setShowSettings((s) => !s)}>
              <Text style={styles.settingsToggleText}>⚙ Server — {active === 'cloud' ? 'Cloud (VPS)' : 'LAN'}</Text>
            </TouchableOpacity>

            {showSettings && (
              <View>
                <View style={styles.serverPickRow}>
                  <TouchableOpacity
                    style={[styles.serverPick, active === 'cloud' && styles.serverPickActive]}
                    onPress={() => pick('cloud')}
                  >
                    <Text style={[styles.serverPickText, active === 'cloud' && styles.serverPickTextActive]}>☁ Cloud (VPS)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.serverPick, active === 'lan' && styles.serverPickActive]}
                    onPress={() => pick('lan')}
                  >
                    <Text style={[styles.serverPickText, active === 'lan' && styles.serverPickTextActive]}>🏠 LAN</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Cloud server (VPS)</Text>
                <TextInput
                  style={styles.input}
                  value={cloudUrl}
                  onChangeText={setCloudUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="http://169.58.66.151:3000"
                  placeholderTextColor={colors.muted}
                />
                <Text style={styles.label}>LAN server (same Wi-Fi)</Text>
                <TextInput
                  style={styles.input}
                  value={lanUrl}
                  onChangeText={setLanUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="http://192.168.1.42:3000"
                  placeholderTextColor={colors.muted}
                />
                <TouchableOpacity style={styles.btnSecondary} onPress={saveUrls}>
                  <Text style={styles.btnSecondaryText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.card, borderRadius: radiusLg, padding: 30,
    ...shadowDeep
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 30, height: 30, borderRadius: radiusSm,
    alignItems: 'center', justifyContent: 'center'
  },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  brandName: { color: colors.navy, fontSize: 20, fontWeight: '700', marginLeft: 10, letterSpacing: 0.3 },
  tagline: { textAlign: 'center', color: colors.muted, fontSize: 14, marginBottom: 24, marginTop: 6 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radiusSm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    color: colors.text, backgroundColor: '#fff'
  },
  msgError: {
    backgroundColor: colors.redSoft, borderRadius: radiusSm,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14
  },
  msgErrorText: { color: colors.red, fontSize: 14 },
  btn: {
    backgroundColor: colors.blue, borderRadius: radiusSm,
    alignItems: 'center', paddingVertical: 12
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  demoCreds: {
    marginTop: 22, backgroundColor: colors.bg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12
  },
  demoCredsTitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  demoCredsText: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  code: {
    backgroundColor: colors.border, color: colors.navy, fontSize: 11,
    paddingHorizontal: 6, paddingVertical: 1
  },
  settingsToggle: { alignItems: 'center', marginTop: 18 },
  settingsToggleText: { color: colors.muted, fontSize: 13 },
  serverPickRow: { flexDirection: 'row', marginBottom: 6, gap: 8 },
  serverPick: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radiusSm,
    alignItems: 'center', paddingVertical: 9, marginTop: 10, backgroundColor: colors.bg
  },
  serverPickActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  serverPickText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  serverPickTextActive: { color: colors.navy },
  btnSecondary: {
    borderWidth: 1, borderColor: colors.slate2, borderRadius: radiusSm,
    alignItems: 'center', paddingVertical: 10, marginTop: 10, marginBottom: 6
  },
  btnSecondaryText: { color: colors.slate, fontWeight: '600', fontSize: 14 }
});
