import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import client from '../api/client';
import colors from '../constants/colors';
import { translations } from '../constants/translations';

const asDate = (v) => {
  try {
    const d = v ? new Date(v) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
};

const fmtShort = (v) => {
  const d = asDate(v);
  if (!d) return '-';
  try {
    return d.toLocaleDateString();
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

export default function FieldOfficerPerformanceScreen({ lang = 'english', onBack }) {
  const t = translations[lang || 'english'];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [perf, setPerf] = useState(null);

  const fetchPerf = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await client.get('/performance/field-officer');
      if (res.data?.success) setPerf(res.data.performance || null);
      else setPerf(null);
    } catch {
      if (!silent) setPerf(null);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPerf(false);
  }, [fetchPerf]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPerf(true);
  };

  const stats = useMemo(() => {
    const p = perf || {};
    return {
      totalAssigned: Number(p.totalAssigned || 0),
      resolved: Number(p.resolved || 0),
      pending: Number(p.pending || 0),
      inProgress: Number(p.inProgress || 0),
      avgResolutionTime: String(p.avgResolutionTime || 0)
    };
  }, [perf]);

  const recent = useMemo(() => {
    const list = Array.isArray(perf?.recentResolved) ? perf.recentResolved : [];
    return list;
  }, [perf]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← {t.back || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.performance || 'Performance'}</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t.totalAssigned || 'Total Assigned'}</Text>
                <Text style={styles.statValue}>{stats.totalAssigned}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t.resolved || 'Resolved'}</Text>
                <Text style={styles.statValue}>{stats.resolved}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t.pending || 'Pending'}</Text>
                <Text style={styles.statValue}>{stats.pending}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t.inProgress || 'In Progress'}</Text>
                <Text style={styles.statValue}>{stats.inProgress}</Text>
              </View>
              <View style={styles.statCardWide}>
                <Text style={styles.statLabel}>{t.avgResolutionTime || 'Avg Resolution Time (days)'}</Text>
                <Text style={styles.statValue}>{stats.avgResolutionTime}</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.recentResolved || 'Recent Resolved'}</Text>
            </View>

            {recent.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t.noData || 'No data'}</Text>
              </View>
            ) : (
              recent.map(r => (
                <View key={String(r?.id || r?._id || Math.random())} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{String(r?.complaintId || '').trim() || '—'}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{t.resolved || 'Resolved'}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardSub}>{t.category || 'Category'}: {String(r?.category || '').trim() || '—'}</Text>
                  <Text style={styles.cardSub}>{t.citizen || 'Citizen'}: {String(r?.citizenName || '').trim() || '—'}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{t.assignedDate || 'Assigned'}: {fmtShort(r?.assignedDate)}</Text>
                    <Text style={styles.metaText}>{t.resolvedAt || 'Resolved'}: {fmtShort(r?.resolvedAt)}</Text>
                  </View>
                </View>
              ))
            )}
          </>
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
  loadingWrap: { paddingVertical: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  statCardWide: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  statLabel: { color: colors.textSecondary, fontWeight: '800', fontSize: 12 },
  statValue: { color: colors.text, fontWeight: '900', fontSize: 28, marginTop: 6 },
  sectionHeader: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  emptyCard: { marginTop: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  emptyText: { color: colors.textSecondary, fontWeight: '700' },
  card: { marginTop: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: colors.text, fontWeight: '900', fontSize: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(46,204,113,0.15)' },
  badgeText: { fontWeight: '900', fontSize: 11, color: colors.success },
  cardSub: { marginTop: 8, color: colors.textSecondary, fontWeight: '700' },
  metaRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  metaText: { color: colors.placeholder, fontWeight: '800', fontSize: 12 }
});

