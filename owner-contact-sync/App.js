import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import { StatusBar } from 'expo-status-bar';

const DEFAULT_API = 'https://best-electrical-backend.onrender.com/api';
const PAGE_SIZE = 500;

function dedupeKey(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  if (digits.length === 10) digits = '91' + digits;
  return digits;
}

async function postImport(apiBase, adminKey, contacts) {
  const response = await fetch(apiBase.replace(/\/$/, '') + '/admin/marketing/contacts/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
    body: JSON.stringify({ contacts })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || ('Import failed: HTTP ' + response.status));
  return data;
}

export default function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API);
  const [adminKey, setAdminKey] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [summary, setSummary] = useState(null);

  async function syncContacts() {
    if (!confirmed) {
      Alert.alert('Confirm contact handling', 'Confirm that you are authorized to import this address book. Contact import does not mean the people have agreed to receive marketing.');
      return;
    }
    if (adminKey.trim().length < 24) {
      Alert.alert('Admin key required', 'Enter the backend ADMIN_API_KEY (at least 24 characters). It is sent only to your configured backend over HTTPS and is not saved by this app.');
      return;
    }
    setBusy(true);
    setSummary(null);
    setProgress('Requesting Android contacts permission…');
    try {
      let permission = await Contacts.getPermissionsAsync();
      if (permission.status !== 'granted') permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Contacts permission was not granted. Enable it in Android Settings to continue.');

      setProgress('Reading contacts from this phone…');
      const unique = new Map();
      let offset = 0;
      let hasNextPage = true;
      while (hasNextPage) {
        const page = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          pageSize: PAGE_SIZE,
          pageOffset: offset,
          sort: Contacts.SortTypes.FirstName
        });
        for (const contact of page.data || []) {
          for (const item of contact.phoneNumbers || []) {
            const phone = String(item.number || '').trim();
            const key = dedupeKey(phone);
            if (!key || key.length < 10 || key.length > 15) continue;
            const prior = unique.get(key);
            if (!prior || (!prior.name && contact.name)) {
              unique.set(key, {
                name: String(contact.name || '').trim().slice(0, 120),
                phone,
                source: 'android-owner-contact-sync'
              });
            }
          }
        }
        offset += (page.data || []).length;
        hasNextPage = Boolean(page.hasNextPage);
        if (!page.data?.length) break;
        setProgress('Read ' + offset + ' contact records…');
      }

      const contacts = [...unique.values()];
      if (!contacts.length) throw new Error('No usable phone numbers were found in the phone contacts.');
      let created = 0, updated = 0, invalid = 0;
      for (let i = 0; i < contacts.length; i += 500) {
        setProgress('Syncing contacts ' + Math.min(i + 500, contacts.length) + ' of ' + contacts.length + '…');
        const result = await postImport(apiBase, adminKey.trim(), contacts.slice(i, i + 500));
        created += result.created || 0;
        updated += result.updated || 0;
        invalid += result.invalid || 0;
      }
      setSummary({ total: contacts.length, created, updated, invalid });
      setProgress('Contact sync completed.');
    } catch (error) {
      setProgress('Sync stopped.');
      Alert.alert('Contact sync failed', error.message || 'Check internet connection and backend configuration.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.brandRow}>
          <View style={s.logo}><Text style={s.logoText}>⚡</Text></View>
          <View>
            <Text style={s.brand}>BEST ELECTRICAL</Text>
            <Text style={s.brandSub}>OWNER CONTACT SYNC</Text>
          </View>
        </View>

        <View style={s.hero}>
          <Text style={s.heroEyebrow}>OWNER TOOL · ANDROID</Text>
          <Text style={s.heroTitle}>Import your contacts in one go.</Text>
          <Text style={s.heroText}>Read phone contacts after Android permission, remove duplicate phone entries, and sync names and numbers to the private shop contact registry.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.step}>01 · BACKEND</Text>
          <Text style={s.label}>Backend API URL</Text>
          <TextInput
            value={apiBase}
            onChangeText={setApiBase}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={s.input}
            placeholder="https://your-backend.example/api"
          />
          <Text style={s.label}>Admin API key</Text>
          <TextInput
            value={adminKey}
            onChangeText={setAdminKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
            placeholder="Enter backend ADMIN_API_KEY"
          />
          <Text style={s.helper}>The key is kept in memory only. Configure the matching ADMIN_API_KEY on the backend host; never commit it to GitHub.</Text>
        </View>

        <TouchableOpacity style={s.consentRow} onPress={() => setConfirmed(v => !v)} activeOpacity={0.85}>
          <View style={[s.checkbox, confirmed && s.checkboxChecked]}>{confirmed ? <Text style={s.checkMark}>✓</Text> : null}</View>
          <Text style={s.consentText}>I am authorized to sync this phone address book for BEST ELECTRICAL management, and I understand that importing contacts does not grant SMS or WhatsApp marketing consent.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.primary, (busy || !confirmed) && s.disabled]} onPress={syncContacts} disabled={busy || !confirmed}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Sync all phone contacts</Text>}
        </TouchableOpacity>
        <Text style={s.progress}>{progress || 'Nothing has been synced in this session yet.'}</Text>

        {summary && (
          <View style={s.result}>
            <Text style={s.resultTitle}>Sync complete</Text>
            <View style={s.stats}>
              <View style={s.stat}><Text style={s.statValue}>{summary.total}</Text><Text style={s.statLabel}>Unique numbers read</Text></View>
              <View style={s.stat}><Text style={s.statValue}>{summary.created}</Text><Text style={s.statLabel}>New records</Text></View>
              <View style={s.stat}><Text style={s.statValue}>{summary.updated}</Text><Text style={s.statLabel}>Updated records</Text></View>
            </View>
            <Text style={s.helper}>{summary.invalid} invalid rows skipped. All newly imported numbers remain opted out until separate, channel-specific customer consent is recorded in the admin panel.</Text>
          </View>
        )}

        <View style={s.privacy}>
          <Text style={s.privacyTitle}>Privacy and delivery rules</Text>
          <Text style={s.privacyText}>• Only names and phone numbers are read; photos, email, notes and addresses are not uploaded.</Text>
          <Text style={s.privacyText}>• Sync happens only after the owner presses this button and grants Android contacts permission.</Text>
          <Text style={s.privacyText}>• This tool does not send SMS, WhatsApp messages or access customer phones.</Text>
          <Text style={s.privacyText}>• Customers do not need to install any app.</Text>
        </View>
        <Text style={s.footer}>BEST ELECTRICAL · Private shop-owner utility</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f6fc' },
  content: { padding: 20, paddingTop: 30, paddingBottom: 42 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  logo: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#ffbd35', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 27, color: '#13234f' },
  brand: { color: '#172554', fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
  brandSub: { color: '#4d36d8', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginTop: 4 },
  hero: { backgroundColor: '#17285f', borderRadius: 20, padding: 23, marginBottom: 16 },
  heroEyebrow: { color: '#ffce62', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: 'white', fontSize: 27, fontWeight: '900', lineHeight: 33, marginTop: 10 },
  heroText: { color: '#d9e1ff', fontSize: 13, lineHeight: 20, marginTop: 10 },
  card: { backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f5', padding: 17 },
  step: { color: '#4d36d8', fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '800', color: '#344264', marginTop: 9, marginBottom: 6 },
  input: { backgroundColor: '#fbfcff', borderWidth: 1, borderColor: '#dbe2f0', borderRadius: 10, padding: 12, fontSize: 13, color: '#172554' },
  helper: { color: '#7a86a7', fontSize: 11, lineHeight: 17, marginTop: 9 },
  consentRow: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', marginVertical: 17 },
  checkbox: { width: 23, height: 23, borderRadius: 6, borderWidth: 1.5, borderColor: '#8793b5', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#4d36d8', borderColor: '#4d36d8' },
  checkMark: { color: 'white', fontWeight: '900' },
  consentText: { flex: 1, color: '#4b5879', fontSize: 12, lineHeight: 18 },
  primary: { minHeight: 51, borderRadius: 12, backgroundColor: '#4d36d8', alignItems: 'center', justifyContent: 'center', padding: 14 },
  disabled: { opacity: 0.5 },
  primaryText: { color: 'white', fontSize: 14, fontWeight: '900' },
  progress: { color: '#677593', fontSize: 12, lineHeight: 18, marginVertical: 12 },
  result: { borderRadius: 14, backgroundColor: '#eafbf1', borderWidth: 1, borderColor: '#b5edcc', padding: 15, marginBottom: 15 },
  resultTitle: { color: '#146c43', fontSize: 17, fontWeight: '900' },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, borderRadius: 9, backgroundColor: 'white', padding: 10 },
  statValue: { color: '#172554', fontWeight: '900', fontSize: 20 },
  statLabel: { color: '#7a86a7', fontSize: 10, lineHeight: 14, marginTop: 4 },
  privacy: { backgroundColor: '#fff8e8', borderWidth: 1, borderColor: '#ffdfaa', borderRadius: 13, padding: 15, marginTop: 4 },
  privacyTitle: { color: '#81530b', fontSize: 13, fontWeight: '900', marginBottom: 8 },
  privacyText: { color: '#7b6744', fontSize: 11, lineHeight: 17, marginTop: 4 },
  footer: { color: '#98a1b8', textAlign: 'center', fontSize: 10, marginTop: 22 }
});
