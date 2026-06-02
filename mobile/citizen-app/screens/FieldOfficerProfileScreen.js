import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import colors from '../constants/colors';
import { translations } from '../constants/translations';

export default function FieldOfficerProfileScreen({ lang = 'english', user, onBack }) {
  const t = translations[lang || 'english'];
  const name = String(user?.fullName || '').trim() || '—';
  const email = String(user?.email || '').trim() || '—';
  const department = String(user?.department || '').trim() || '—';
  const role = String(user?.role || '').trim() || 'field-officer';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← {t.back || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile || 'Profile'}</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name !== '—' ? name.slice(0, 1).toUpperCase() : 'F'}</Text>
          </View>
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroMeta}>{t.fieldOfficer || 'Field Officer'} · {department}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.k}>{t.fullName || 'Full Name'}</Text>
            <Text style={styles.v}>{name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.k}>{t.emailPlaceholder || 'Email'}</Text>
            <Text style={styles.v}>{email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.k}>{t.department || 'Department'}</Text>
            <Text style={styles.v}>{department}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.k}>{t.role || 'Role'}</Text>
            <Text style={styles.v}>{role}</Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>{t.note || 'Note'}</Text>
          <Text style={styles.noteText}>
            {t.profileNote || 'Profile editing and password change can be enabled when the backend exposes officer profile endpoints.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(26,42,108,0.10)' },
  backBtn: { paddingVertical: 8, paddingRight: 10 },
  backText: { color: colors.primary, fontWeight: '900' },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  scroll: { padding: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', paddingVertical: 18, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  avatar: { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(26,42,108,0.12)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '900', fontSize: 28 },
  heroName: { marginTop: 10, color: colors.text, fontWeight: '900', fontSize: 18 },
  heroMeta: { marginTop: 4, color: colors.textSecondary, fontWeight: '800' },
  card: { marginTop: 12, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)', overflow: 'hidden' },
  row: { paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.06)' },
  k: { color: colors.placeholder, fontWeight: '900', fontSize: 12 },
  v: { color: colors.text, fontWeight: '800', marginTop: 6 },
  noteCard: { marginTop: 12, backgroundColor: 'rgba(26,42,108,0.06)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  noteTitle: { color: colors.primary, fontWeight: '900', fontSize: 13 },
  noteText: { marginTop: 8, color: colors.textSecondary, fontWeight: '700', lineHeight: 18 }
});

