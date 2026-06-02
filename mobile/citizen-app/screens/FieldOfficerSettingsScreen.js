import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import colors from '../constants/colors';
import { translations } from '../constants/translations';

export default function FieldOfficerSettingsScreen({ lang = 'english', setLang, onBack, onLogout }) {
  const t = translations[lang || 'english'];

  const toggleLang = () => {
    if (typeof setLang === 'function') setLang(lang === 'english' ? 'urdu' : 'english');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← {t.back || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.settings || 'Settings'}</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.language || 'Language'}</Text>
          <TouchableOpacity style={styles.rowBtn} onPress={toggleLang}>
            <Text style={styles.rowBtnText}>{lang === 'english' ? 'اردو' : 'English'}</Text>
            <Text style={styles.rowBtnHint}>{t.tapToChange || 'Tap to change'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.account || 'Account'}</Text>
          <TouchableOpacity style={[styles.rowBtn, styles.rowBtnDanger]} onPress={onLogout}>
            <Text style={[styles.rowBtnText, styles.rowBtnTextDanger]}>{t.logout || 'Logout'}</Text>
            <Text style={styles.rowBtnHint}>{t.signOutDesc || 'Sign out of the app'}</Text>
          </TouchableOpacity>
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
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)', marginBottom: 12 },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 14, marginBottom: 10 },
  rowBtn: { backgroundColor: colors.light, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(26,42,108,0.14)', paddingVertical: 14, paddingHorizontal: 14 },
  rowBtnText: { color: colors.primary, fontWeight: '900', fontSize: 14 },
  rowBtnHint: { marginTop: 4, color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  rowBtnDanger: { borderColor: 'rgba(231,76,60,0.25)' },
  rowBtnTextDanger: { color: colors.danger }
});

