import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const fmt = (v) => {
  const d = asDate(v);
  if (!d) return '-';
  try {
    return d.toLocaleString();
  } catch {
    return d.toISOString();
  }
};

const normalizeStatus = (s) => String(s || '').toLowerCase().trim();
const normalizePriority = (p) => String(p || '').toLowerCase().trim();

const priorityStyle = (priority) => {
  const p = normalizePriority(priority);
  if (p === 'critical') return { bg: '#fde2e2', fg: '#9b1c1c' };
  if (p === 'high') return { bg: '#fff3cd', fg: '#8a4b00' };
  if (p === 'medium') return { bg: '#e6f4ff', fg: '#0b4f8a' };
  return { bg: '#eef2f7', fg: '#334155' };
};

const statusStyle = (status) => {
  const s = normalizeStatus(status);
  if (s === 'completed') return { bg: '#e8fff1', fg: '#0f6a2f' };
  if (s === 'resolved') return { bg: '#ecfeff', fg: '#155e75' };
  if (s === 'in-progress' || s === 'progress') return { bg: '#eef2ff', fg: '#3730a3' };
  if (s === 'pending') return { bg: '#fff7ed', fg: '#9a3412' };
  return { bg: '#f1f5f9', fg: '#334155' };
};

export default function FieldOfficerHomeScreen({
  lang = 'english',
  setLang,
  user,
  onAssignedComplaints,
  onComplaintChat,
  onNotifications,
  onPerformance,
  onProfile,
  onSettings,
  onOpenComplaint,
  onOpenChat,
  onLogout
}) {
  const t = translations[lang || 'english'];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [complaints, setComplaints] = useState([]);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await client.get('/complaints/field-officer/assigned');
      if (res.data?.success) setComplaints(Array.isArray(res.data.complaints) ? res.data.complaints : []);
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

  const stats = useMemo(() => {
    const list = Array.isArray(complaints) ? complaints : [];
    const totalAssigned = list.length;
    const inProgress = list.filter(c => {
      const s = normalizeStatus(c?.status);
      return s === 'in-progress' || s === 'progress';
    }).length;
    const completed = list.filter(c => normalizeStatus(c?.status) === 'completed').length;
    const pendingVerification = list.filter(c => normalizeStatus(c?.status) === 'resolved').length;
    const highPriority = list.filter(c => {
      const p = normalizePriority(c?.priority);
      return p === 'high' || p === 'critical';
    }).length;
    return { totalAssigned, inProgress, completed, highPriority, pendingVerification };
  }, [complaints]);

  const recent = useMemo(() => {
    const list = Array.isArray(complaints) ? complaints : [];
    return [...list]
      .sort((a, b) => {
        const ad = asDate(a?.assignedDate)?.getTime() || 0;
        const bd = asDate(b?.assignedDate)?.getTime() || 0;
        return bd - ad;
      })
      .slice(0, 6);
  }, [complaints]);

  const toggleLang = () => {
    if (typeof setLang === 'function') setLang(lang === 'english' ? 'urdu' : 'english');
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.primaryHover]} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{t.fieldOfficer || 'Field Officer'}</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {String(user?.fullName || '').trim() || '—'} · {String(user?.department || '').trim() || (t.department || 'Department')}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerPill} onPress={toggleLang}>
              <Text style={styles.headerPillText}>{lang === 'english' ? 'اردو' : 'EN'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerPill} onPress={onLogout}>
              <Text style={styles.headerPillText}>{t.logout || 'Logout'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={onAssignedComplaints}>
            <Text style={styles.navBtnText}>{t.assignedComplaints || 'Assigned'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={onComplaintChat}>
            <Text style={styles.navBtnText}>{t.complaintChat || 'Complaint Chat'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={onNotifications}>
            <Text style={styles.navBtnText}>{t.notifications || 'Notifications'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtnAlt} onPress={onPerformance}>
            <Text style={styles.navBtnAltText}>{t.performance || 'Performance'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtnAlt} onPress={onProfile}>
            <Text style={styles.navBtnAltText}>{t.profile || 'Profile'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtnAlt} onPress={onSettings}>
            <Text style={styles.navBtnAltText}>{t.settings || 'Settings'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.assignedComplaints || 'Assigned'}</Text>
            <Text style={styles.statValue}>{stats.totalAssigned}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.inProgress || 'In Progress'}</Text>
            <Text style={styles.statValue}>{stats.inProgress}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.completed || 'Completed'}</Text>
            <Text style={styles.statValue}>{stats.completed}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.highPriority || 'High Priority'}</Text>
            <Text style={styles.statValue}>{stats.highPriority}</Text>
          </View>
          <View style={styles.statCardWide}>
            <Text style={styles.statLabel}>{t.pendingVerification || 'Pending Verification'}</Text>
            <Text style={styles.statValue}>{stats.pendingVerification}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.recentAssignments || 'Recent Assignments'}</Text>
          <TouchableOpacity onPress={onAssignedComplaints}>
            <Text style={styles.sectionLink}>{t.viewAll || 'View all'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : recent.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t.noAssignedComplaints || 'No assigned complaints'}</Text>
          </View>
        ) : (
          recent.map(c => {
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
                <Text style={styles.metaSmall}>{t.assignedDate || 'Assigned'}: {fmt(c?.assignedDate)}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => onOpenComplaint(id)}>
                    <Text style={styles.actionBtnPrimaryText}>{t.viewDetails || 'View Details'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => onOpenChat(id)}>
                    <Text style={styles.actionBtnSecondaryText}>{t.chat || 'Chat'}</Text>
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
  header: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerLeft: { flex: 1 },
  headerTitle: { color: colors.light, fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.85)', marginTop: 4, fontSize: 12, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerPill: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.28)', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  headerPillText: { color: colors.light, fontWeight: '800', fontSize: 12 },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  navBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.24)', borderWidth: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  navBtnText: { color: colors.light, fontWeight: '800', fontSize: 13 },
  navBtnAlt: { flex: 1, backgroundColor: colors.light, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  navBtnAltText: { color: colors.primary, fontWeight: '900', fontSize: 13 },
  scroll: { padding: 16, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  statCardWide: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  statLabel: { color: colors.textSecondary, fontWeight: '800', fontSize: 12 },
  statValue: { color: colors.text, fontWeight: '900', fontSize: 28, marginTop: 6 },
  sectionHeader: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  sectionLink: { color: colors.primary, fontSize: 13, fontWeight: '900' },
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
  cardActions: { marginTop: 12, flexDirection: 'row', gap: 10 },
  actionBtnPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  actionBtnPrimaryText: { color: colors.light, fontWeight: '900' },
  actionBtnSecondary: { flex: 1, backgroundColor: colors.light, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(26,42,108,0.18)' },
  actionBtnSecondaryText: { color: colors.primary, fontWeight: '900' }
});
