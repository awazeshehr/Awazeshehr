import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import client from '../api/client';
import colors from '../constants/colors';
import { translations } from '../constants/translations';

const normalize = (v) => String(v || '').trim().toLowerCase();

const priorityStyle = (priority) => {
  const p = normalize(priority);
  if (p === 'critical') return { bg: '#fde2e2', fg: '#9b1c1c' };
  if (p === 'high') return { bg: '#fff3cd', fg: '#8a4b00' };
  if (p === 'medium') return { bg: '#e6f4ff', fg: '#0b4f8a' };
  return { bg: '#eef2f7', fg: '#334155' };
};

const statusStyle = (status) => {
  const s = normalize(status);
  if (s === 'completed') return { bg: '#e8fff1', fg: '#0f6a2f' };
  if (s === 'resolved') return { bg: '#ecfeff', fg: '#155e75' };
  if (s === 'in-progress' || s === 'progress') return { bg: '#eef2ff', fg: '#3730a3' };
  if (s === 'pending') return { bg: '#fff7ed', fg: '#9a3412' };
  return { bg: '#f1f5f9', fg: '#334155' };
};

const fmtShort = (v) => {
  try {
    const d = v ? new Date(v) : null;
    if (!d || Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
  } catch {
    return '-';
  }
};

export default function FieldOfficerComplaintChatListScreen({
  lang = 'english',
  onBack,
  onOpenChat,
  onOpenComplaint
}) {
  const t = translations[lang || 'english'];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await client.get('/complaints/field-officer/assigned');
      if (res.data?.success) setComplaints(Array.isArray(res.data.complaints) ? res.data.complaints : []);
      else setComplaints([]);
    } catch {
      if (!silent) setComplaints([]);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const list = useMemo(() => {
    const q = normalize(search);
    const items = Array.isArray(complaints) ? complaints : [];
    const filtered = items.filter(c => {
      const id = String(c?.complaintId || c?.id || c?._id || '').toLowerCase();
      const title = String(c?.title || '').toLowerCase();
      const desc = String(c?.description || '').toLowerCase();
      if (!q) return true;
      return id.includes(q) || title.includes(q) || desc.includes(q);
    });
    return filtered;
  }, [complaints, search]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← {t.back || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.complaintChat || 'Complaint Chat'}</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchCard}>
          <Text style={styles.label}>{t.search || 'Search'}</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.searchComplaints || 'Search by ID or text'}
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t.noData || 'No data'}</Text>
          </View>
        ) : (
          list.map(c => {
            const id = String(c?.id || c?._id || '');
            const pid = String(c?.complaintId || id || '').trim();
            const pr = priorityStyle(c?.priority);
            const st = statusStyle(c?.status);
            return (
              <View key={id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{pid}</Text>
                  <View style={[styles.badge, { backgroundColor: pr.bg }]}>
                    <Text style={[styles.badgeText, { color: pr.fg }]}>{String(c?.priority || '').toUpperCase() || '—'}</Text>
                  </View>
                </View>
                <Text style={styles.cardSub} numberOfLines={2}>{String(c?.title || c?.description || '').trim() || '—'}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{t.category || 'Category'}: {String(c?.category || '').trim() || '—'}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.fg }]}>{String(c?.status || '').toUpperCase() || '—'}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{t.sector || 'Sector'}: {String(c?.sector || '').trim() || '—'}</Text>
                  <Text style={styles.metaText}>{t.subsector || 'Subsector'}: {String(c?.subsector || '').trim() || '—'}</Text>
                </View>
                <Text style={styles.metaSmall}>{t.assignedDate || 'Assigned'}: {fmtShort(c?.assignedDate)}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => onOpenChat(id)}>
                    <Text style={styles.btnPrimaryText}>{t.chat || 'Chat'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnSecondary} onPress={() => onOpenComplaint(id)}>
                    <Text style={styles.btnSecondaryText}>{t.viewDetails || 'View Details'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
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
  searchCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  label: { color: colors.textSecondary, fontWeight: '800', fontSize: 12, marginBottom: 8 },
  searchInput: { backgroundColor: colors.light, borderRadius: 14, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 12, paddingVertical: 12, color: colors.text, fontWeight: '700' },
  loadingWrap: { paddingVertical: 22 },
  emptyCard: { marginTop: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  emptyText: { color: colors.textSecondary, fontWeight: '700' },
  card: { marginTop: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: colors.text, fontWeight: '900', fontSize: 14 },
  cardSub: { marginTop: 8, color: colors.textSecondary, fontWeight: '600', lineHeight: 18 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontWeight: '900', fontSize: 11 },
  metaRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  metaText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12, flex: 1 },
  metaSmall: { marginTop: 8, color: colors.placeholder, fontWeight: '700', fontSize: 12 },
  actions: { marginTop: 12, flexDirection: 'row', gap: 10 },
  btnPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  btnPrimaryText: { color: colors.light, fontWeight: '900' },
  btnSecondary: { flex: 1, backgroundColor: colors.light, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(26,42,108,0.18)' },
  btnSecondaryText: { color: colors.primary, fontWeight: '900' }
});

