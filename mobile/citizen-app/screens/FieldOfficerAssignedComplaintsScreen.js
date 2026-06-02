import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, TextInput, Modal, FlatList, ActivityIndicator } from 'react-native';
import client from '../api/client';
import colors from '../constants/colors';
import { translations } from '../constants/translations';

const normalize = (v) => String(v || '').trim().toLowerCase();
const normalizeStatus = (v) => {
  const s = normalize(v);
  return s === 'progress' ? 'in-progress' : s;
};

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

const priorityStyle = (priority) => {
  const p = normalize(priority);
  if (p === 'critical') return { bg: '#fde2e2', fg: '#9b1c1c' };
  if (p === 'high') return { bg: '#fff3cd', fg: '#8a4b00' };
  if (p === 'medium') return { bg: '#e6f4ff', fg: '#0b4f8a' };
  return { bg: '#eef2f7', fg: '#334155' };
};

const statusStyle = (status) => {
  const s = normalizeStatus(status);
  if (s === 'completed') return { bg: '#e8fff1', fg: '#0f6a2f' };
  if (s === 'resolved') return { bg: '#ecfeff', fg: '#155e75' };
  if (s === 'in-progress') return { bg: '#eef2ff', fg: '#3730a3' };
  if (s === 'pending') return { bg: '#fff7ed', fg: '#9a3412' };
  return { bg: '#f1f5f9', fg: '#334155' };
};

function PickerModal({ visible, title, items, value, onSelect, onClose, t }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>{t.close || 'Close'}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(it) => String(it?.key)}
            renderItem={({ item }) => {
              const selected = String(value) === String(item?.key);
              return (
                <TouchableOpacity
                  style={[styles.modalRow, selected ? styles.modalRowSelected : null]}
                  onPress={() => {
                    onSelect(item?.key);
                    onClose();
                  }}
                >
                  <Text style={[styles.modalRowText, selected ? styles.modalRowTextSelected : null]}>
                    {item?.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function FieldOfficerAssignedComplaintsScreen({
  lang = 'english',
  onBack,
  onOpenComplaint,
  onOpenChat
}) {
  const t = translations[lang || 'english'];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [complaints, setComplaints] = useState([]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');
  const [sector, setSector] = useState('all');
  const [subsector, setSubsector] = useState('all');

  const [pickerOpen, setPickerOpen] = useState(null);

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

  const filterOptions = useMemo(() => {
    const list = Array.isArray(complaints) ? complaints : [];
    const categories = Array.from(new Set(list.map(c => String(c?.category || '').trim()).filter(Boolean))).sort();
    const priorities = Array.from(new Set(list.map(c => String(c?.priority || '').trim()).filter(Boolean))).sort();
    const sectors = Array.from(new Set(list.map(c => String(c?.sector || '').trim()).filter(Boolean))).sort();
    const subsectors = Array.from(new Set(list.map(c => String(c?.subsector || '').trim()).filter(Boolean))).sort();

    return {
      status: [
        { key: 'all', label: t.all || 'All' },
        { key: 'pending', label: t.pending || 'Pending' },
        { key: 'in-progress', label: t.inProgress || 'In Progress' },
        { key: 'resolved', label: t.resolved || 'Resolved' },
        { key: 'completed', label: t.completed || 'Completed' }
      ],
      category: [{ key: 'all', label: t.all || 'All' }].concat(categories.map(x => ({ key: x, label: x }))),
      priority: [{ key: 'all', label: t.all || 'All' }].concat(priorities.map(x => ({ key: x, label: x }))),
      sector: [{ key: 'all', label: t.all || 'All' }].concat(sectors.map(x => ({ key: x, label: x }))),
      subsector: [{ key: 'all', label: t.all || 'All' }].concat(subsectors.map(x => ({ key: x, label: x })))
    };
  }, [complaints, t]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    const list = Array.isArray(complaints) ? complaints : [];
    return list.filter(c => {
      const id = String(c?.complaintId || c?.id || c?._id || '').toLowerCase();
      const title = String(c?.title || '').toLowerCase();
      const desc = String(c?.description || '').toLowerCase();

      if (q && !id.includes(q) && !title.includes(q) && !desc.includes(q)) return false;
      if (status !== 'all' && normalizeStatus(c?.status) !== normalizeStatus(status)) return false;
      if (category !== 'all' && String(c?.category || '') !== String(category)) return false;
      if (priority !== 'all' && String(c?.priority || '') !== String(priority)) return false;
      if (sector !== 'all' && String(c?.sector || '') !== String(sector)) return false;
      if (subsector !== 'all' && String(c?.subsector || '') !== String(subsector)) return false;
      return true;
    }).sort((a, b) => {
      const ad = asDate(a?.assignedDate)?.getTime() || 0;
      const bd = asDate(b?.assignedDate)?.getTime() || 0;
      return bd - ad;
    });
  }, [complaints, search, status, category, priority, sector, subsector]);

  const activePicker = pickerOpen ? filterOptions[pickerOpen] : null;
  const activeValue =
    pickerOpen === 'status' ? status :
      pickerOpen === 'category' ? category :
        pickerOpen === 'priority' ? priority :
          pickerOpen === 'sector' ? sector :
            pickerOpen === 'subsector' ? subsector : null;

  const activeTitle =
    pickerOpen === 'status' ? (t.status || 'Status') :
      pickerOpen === 'category' ? (t.category || 'Category') :
        pickerOpen === 'priority' ? (t.priority || 'Priority') :
          pickerOpen === 'sector' ? (t.sector || 'Sector') :
            pickerOpen === 'subsector' ? (t.subsector || 'Subsector') : '';

  const applyPick = (key, v) => {
    if (key === 'status') setStatus(v);
    if (key === 'category') setCategory(v);
    if (key === 'priority') setPriority(v);
    if (key === 'sector') setSector(v);
    if (key === 'subsector') setSubsector(v);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setCategory('all');
    setPriority('all');
    setSector('all');
    setSubsector('all');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← {t.back || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.assignedComplaints || 'Assigned Complaints'}</Text>
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
          <View style={styles.filtersRow}>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setPickerOpen('status')}>
              <Text style={styles.filterBtnText}>{t.status || 'Status'}: {String(status)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setPickerOpen('priority')}>
              <Text style={styles.filterBtnText}>{t.priority || 'Priority'}: {String(priority)}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filtersRow}>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setPickerOpen('category')}>
              <Text style={styles.filterBtnText}>{t.category || 'Category'}: {String(category)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setPickerOpen('sector')}>
              <Text style={styles.filterBtnText}>{t.sector || 'Sector'}: {String(sector)}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filtersRow}>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setPickerOpen('subsector')}>
              <Text style={styles.filterBtnText}>{t.subsector || 'Subsector'}: {String(subsector)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>{t.clear || 'Clear'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countText}>{t.results || 'Results'}: {filtered.length}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t.noData || 'No data'}</Text>
          </View>
        ) : (
          filtered.map(c => {
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
                    <Text style={[styles.badgeText, { color: st.fg }]}>{String(normalizeStatus(c?.status) || '').toUpperCase() || '—'}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{t.sector || 'Sector'}: {String(c?.sector || '').trim() || '—'}</Text>
                  <Text style={styles.metaText}>{t.subsector || 'Subsector'}: {String(c?.subsector || '').trim() || '—'}</Text>
                </View>
                <Text style={styles.metaSmall}>{t.assignedDate || 'Assigned'}: {fmtShort(c?.assignedDate)}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => onOpenComplaint(id)}>
                    <Text style={styles.btnPrimaryText}>{t.viewDetails || 'View Details'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnSecondary} onPress={() => onOpenChat(id)}>
                    <Text style={styles.btnSecondaryText}>{t.chat || 'Chat'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <PickerModal
        visible={!!pickerOpen}
        title={activeTitle}
        items={Array.isArray(activePicker) ? activePicker : []}
        value={activeValue}
        onSelect={(v) => pickerOpen && applyPick(pickerOpen, v)}
        onClose={() => setPickerOpen(null)}
        t={t}
      />
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
  filtersRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  filterBtn: { flex: 1, backgroundColor: colors.light, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.14)', paddingVertical: 10, paddingHorizontal: 10 },
  filterBtnText: { color: colors.textSecondary, fontWeight: '800', fontSize: 12 },
  clearBtn: { width: 92, backgroundColor: 'rgba(26,42,108,0.08)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 10 },
  clearBtnText: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  countRow: { marginTop: 14, marginBottom: 2 },
  countText: { color: colors.textSecondary, fontWeight: '800' },
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
  btnSecondaryText: { color: colors.primary, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.48)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxHeight: '70%', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(26,42,108,0.12)', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(26,42,108,0.10)' },
  modalTitle: { color: colors.text, fontWeight: '900', fontSize: 14 },
  modalCloseBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(26,42,108,0.08)' },
  modalCloseText: { color: colors.primary, fontWeight: '900' },
  modalRow: { paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.06)' },
  modalRowSelected: { backgroundColor: 'rgba(26,42,108,0.08)' },
  modalRowText: { color: colors.textSecondary, fontWeight: '800' },
  modalRowTextSelected: { color: colors.primary, fontWeight: '900' }
});

