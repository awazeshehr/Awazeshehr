import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Modal, TextInput, Linking, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import client, { API_URL } from '../api/client';
import colors from '../constants/colors';
import { translations } from '../constants/translations';

const normalize = (v) => String(v || '').trim().toLowerCase();
const normalizeStatus = (v) => {
  const s = normalize(v);
  return s === 'progress' ? 'in-progress' : s;
};

const fmt = (v) => {
  try {
    const d = v ? new Date(v) : null;
    if (!d || Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  } catch {
    return '-';
  }
};

const toUrl = (u) => {
  const raw = String(u || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  return `${API_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
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

const timeline = (c) => {
  const status = normalizeStatus(c?.status);
  const evidenceCount = Array.isArray(c?.evidence) ? c.evidence.length : 0;
  const assigned = !!c?.assignedDate;
  const inProgress = status === 'in-progress';
  const resolved = status === 'resolved' || status === 'completed';
  const evidence = evidenceCount > 0;
  const awaiting = status === 'resolved';
  const closed = status === 'completed';
  return [
    { key: 'assigned', label: 'Assigned', done: assigned },
    { key: 'in_progress', label: 'In Progress', done: inProgress || resolved || closed },
    { key: 'resolved', label: 'Resolved', done: resolved || closed },
    { key: 'evidence', label: 'Evidence', done: evidence },
    { key: 'verification', label: 'Verification', done: awaiting || closed },
    { key: 'closed', label: 'Closed', done: closed }
  ];
};

export default function FieldOfficerComplaintDetailsScreen({ lang = 'english', complaintId, onBack, onOpenChat }) {
  const t = translations[lang || 'english'];
  const [loading, setLoading] = useState(true);
  const [complaint, setComplaint] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceAssets, setEvidenceAssets] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchComplaint = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get(`/complaints/${complaintId}`);
      if (res.data?.success) setComplaint(res.data.complaint || null);
      else setComplaint(null);
    } catch {
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  const core = useMemo(() => {
    const c = complaint || {};
    const id = String(c?.complaintId || c?._id || complaintId || '').trim();
    const status = normalizeStatus(c?.status);
    const pr = priorityStyle(c?.priority);
    const st = statusStyle(status);
    return { id, status, pr, st };
  }, [complaint, complaintId]);

  const submittedMedia = useMemo(() => {
    const list = Array.isArray(complaint?.media) ? complaint.media : [];
    return list.map(m => ({
      key: m?.filename || m?.url || Math.random().toString(36),
      url: toUrl(m?.url)
    })).filter(x => x.url);
  }, [complaint]);

  const evidenceMedia = useMemo(() => {
    const entries = Array.isArray(complaint?.evidence) ? complaint.evidence : [];
    const out = [];
    entries.forEach((ev, evIdx) => {
      const files = Array.isArray(ev?.files) ? ev.files : [];
      files.forEach((f, fIdx) => {
        const url = toUrl(f?.url);
        if (!url) return;
        out.push({
          key: `${evIdx}-${fIdx}-${f?.filename || ''}`,
          url,
          label: String(ev?.description || '').trim()
        });
      });
    });
    return out;
  }, [complaint]);

  const steps = useMemo(() => timeline(complaint), [complaint]);

  const updateStatus = async (nextStatus) => {
    try {
      setStatusBusy(true);
      const res = await client.put(`/complaints/${complaintId}/status`, { status: nextStatus });
      if (res.data?.success) {
        await fetchComplaint();
      } else {
        Alert.alert(t.error || 'Error', res.data?.message || 'Failed to update status');
      }
    } catch (e) {
      Alert.alert(t.error || 'Error', e?.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusBusy(false);
    }
  };

  const openDirections = async () => {
    const lat = Number(complaint?.location?.lat);
    const lng = Number(complaint?.location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) return;
      await Linking.openURL(url);
    } catch {}
  };

  const pickEvidence = async (source) => {
    try {
      if (source === 'camera') {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (p.status !== 'granted') {
          Alert.alert(t.error || 'Error', t.cameraPermission || 'Camera permission is required');
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8
        });
        if (!res.canceled && Array.isArray(res.assets)) {
          setEvidenceAssets(prev => [...prev, ...res.assets]);
        }
        return;
      }
      const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (p.status !== 'granted') {
        Alert.alert(t.error || 'Error', t.galleryPermission || 'Gallery permission is required');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.8
      });
      if (!res.canceled && Array.isArray(res.assets)) {
        setEvidenceAssets(prev => [...prev, ...res.assets]);
      }
    } catch {}
  };

  const submitEvidence = async () => {
    if (evidenceAssets.length === 0) {
      Alert.alert(t.error || 'Error', t.selectEvidenceFirst || 'Select at least one image');
      return;
    }
    try {
      setUploading(true);
      const form = new FormData();
      form.append('description', String(evidenceNotes || '').trim());
      evidenceAssets.slice(0, 5).forEach((asset, idx) => {
        const uri = asset?.uri;
        if (!uri) return;
        const nameFromUri = uri.split('/').pop() || `evidence_${idx}.jpg`;
        const type = asset?.mimeType || 'image/jpeg';
        form.append('evidence', { uri, name: nameFromUri, type });
      });

      const res = await client.post(`/complaints/${complaintId}/evidence`, form, {
        headers: Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success) {
        setEvidenceOpen(false);
        setEvidenceNotes('');
        setEvidenceAssets([]);
        await fetchComplaint();
      } else {
        Alert.alert(t.error || 'Error', res.data?.message || 'Failed to upload evidence');
      }
    } catch (e) {
      Alert.alert(t.error || 'Error', e?.response?.data?.message || 'Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← {t.back || 'Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.complaintDetails || 'Complaint Details'}</Text>
          <View style={{ width: 56 }} />
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t.noData || 'No data'}</Text>
        </View>
      </View>
    );
  }

  const lat = Number(complaint?.location?.lat);
  const lng = Number(complaint?.location?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const canStart = core.status === 'pending';
  const canResolve = core.status === 'in-progress';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← {t.back || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.complaintDetails || 'Complaint Details'}</Text>
        <TouchableOpacity onPress={onOpenChat} style={styles.chatBtn}>
          <Text style={styles.chatBtnText}>{t.chat || 'Chat'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroId} numberOfLines={1}>{core.id}</Text>
            <View style={[styles.badge, { backgroundColor: core.pr.bg }]}>
              <Text style={[styles.badgeText, { color: core.pr.fg }]}>{String(complaint?.priority || '').toUpperCase() || '—'}</Text>
            </View>
          </View>
          <View style={styles.heroTop}>
            <Text style={styles.heroMeta}>{t.category || 'Category'}: {String(complaint?.category || '').trim() || '—'}</Text>
            <View style={[styles.badge, { backgroundColor: core.st.bg }]}>
              <Text style={[styles.badgeText, { color: core.st.fg }]}>{String(core.status || '').toUpperCase() || '—'}</Text>
            </View>
          </View>
          <Text style={styles.heroDesc}>{String(complaint?.description || '').trim() || '—'}</Text>
          <View style={styles.grid2}>
            <View style={styles.kv}>
              <Text style={styles.k}>{t.sector || 'Sector'}</Text>
              <Text style={styles.v}>{String(complaint?.location?.sector || '').trim() || '—'}</Text>
            </View>
            <View style={styles.kv}>
              <Text style={styles.k}>{t.subsector || 'Subsector'}</Text>
              <Text style={styles.v}>{String(complaint?.location?.subsector || '').trim() || '—'}</Text>
            </View>
          </View>
          <View style={styles.grid2}>
            <View style={styles.kv}>
              <Text style={styles.k}>{t.submitted || 'Submitted'}</Text>
              <Text style={styles.v}>{fmt(complaint?.createdAt)}</Text>
            </View>
            <View style={styles.kv}>
              <Text style={styles.k}>{t.assignedDate || 'Assigned'}</Text>
              <Text style={styles.v}>{fmt(complaint?.assignedDate)}</Text>
            </View>
          </View>
          <View style={styles.kvWide}>
            <Text style={styles.k}>{t.location || 'Location'}</Text>
            <Text style={styles.v}>{String(complaint?.location?.address || '').trim() || '—'}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t.timeline || 'Timeline'}</Text>
          <View style={styles.timeline}>
            {steps.map((s, idx) => (
              <View key={s.key} style={styles.timelineRow}>
                <View style={[styles.dot, s.done ? styles.dotDone : styles.dotTodo]} />
                <Text style={[styles.stepText, s.done ? styles.stepDone : styles.stepTodo]}>{t[`timeline_${s.key}`] || s.label}</Text>
                {idx < steps.length - 1 ? <View style={[styles.line, s.done ? styles.lineDone : styles.lineTodo]} /> : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t.actions || 'Actions'}</Text>
          <View style={styles.actionsRow}>
            {canStart && (
              <TouchableOpacity style={styles.btnPrimary} disabled={statusBusy} onPress={() => updateStatus('in-progress')}>
                <Text style={styles.btnPrimaryText}>{statusBusy ? (t.updating || 'Updating...') : (t.startWork || 'Start Work')}</Text>
              </TouchableOpacity>
            )}
            {canResolve && (
              <TouchableOpacity style={styles.btnPrimary} disabled={statusBusy} onPress={() => updateStatus('resolved')}>
                <Text style={styles.btnPrimaryText}>{statusBusy ? (t.updating || 'Updating...') : (t.markResolved || 'Mark Resolved')}</Text>
              </TouchableOpacity>
            )}
            {!canStart && !canResolve && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillText}>
                  {core.status === 'resolved' ? (t.awaitingVerification || 'Awaiting verification') : (t.statusLocked || 'No actions for current status')}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setEvidenceOpen(true)}>
              <Text style={styles.btnSecondaryText}>{t.uploadEvidence || 'Upload Evidence'}</Text>
            </TouchableOpacity>
            {hasCoords ? (
              <TouchableOpacity style={styles.btnSecondary} onPress={openDirections}>
                <Text style={styles.btnSecondaryText}>{t.openDirections || 'Open Directions'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.btnDisabled}>
                <Text style={styles.btnDisabledText}>{t.noLocation || 'No location'}</Text>
              </View>
            )}
          </View>
        </View>

        {hasCoords && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{t.map || 'Map'}</Text>
            <View style={styles.mapWrap}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01
                }}
              >
                <Marker coordinate={{ latitude: lat, longitude: lng }} />
              </MapView>
            </View>
          </View>
        )}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t.citizenImages || 'Citizen Images'}</Text>
          {submittedMedia.length === 0 ? (
            <Text style={styles.muted}>{t.noImages || 'No images'}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
              {submittedMedia.map(m => (
                <Image key={m.key} source={{ uri: m.url }} style={styles.galleryImg} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t.evidence || 'Evidence'}</Text>
          {evidenceMedia.length === 0 ? (
            <Text style={styles.muted}>{t.noEvidence || 'No evidence uploaded'}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
              {evidenceMedia.map(m => (
                <Image key={m.key} source={{ uri: m.url }} style={styles.galleryImg} />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      <Modal visible={evidenceOpen} transparent animationType="fade" onRequestClose={() => setEvidenceOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.uploadEvidence || 'Upload Evidence'}</Text>
              <TouchableOpacity onPress={() => setEvidenceOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>{t.close || 'Close'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>{t.notes || 'Notes'}</Text>
              <TextInput
                value={evidenceNotes}
                onChangeText={setEvidenceNotes}
                placeholder={t.evidenceNotesPlaceholder || 'e.g., After work evidence'}
                placeholderTextColor={colors.placeholder}
                style={styles.modalInput}
              />
              <View style={styles.modalRowBtns}>
                <TouchableOpacity style={styles.modalBtn} onPress={() => pickEvidence('camera')}>
                  <Text style={styles.modalBtnText}>{t.camera || 'Camera'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtn} onPress={() => pickEvidence('gallery')}>
                  <Text style={styles.modalBtnText}>{t.gallery || 'Gallery'}</Text>
                </TouchableOpacity>
              </View>
              {evidenceAssets.length > 0 && (
                <Text style={styles.modalHint}>{t.selected || 'Selected'}: {evidenceAssets.length}</Text>
              )}
              <TouchableOpacity style={styles.modalSubmit} disabled={uploading} onPress={submitEvidence}>
                <Text style={styles.modalSubmitText}>{uploading ? (t.uploading || 'Uploading...') : (t.submit || 'Submit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(26,42,108,0.10)' },
  backBtn: { paddingVertical: 8, paddingRight: 10 },
  backText: { color: colors.primary, fontWeight: '900' },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  chatBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  chatBtnText: { color: colors.light, fontWeight: '900' },
  scroll: { padding: 16, paddingBottom: 32 },
  heroCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 6 },
  heroId: { flex: 1, color: colors.text, fontWeight: '900', fontSize: 15 },
  heroMeta: { flex: 1, color: colors.textSecondary, fontWeight: '800', fontSize: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontWeight: '900', fontSize: 11 },
  heroDesc: { marginTop: 10, color: colors.textSecondary, fontWeight: '600', lineHeight: 18 },
  grid2: { flexDirection: 'row', gap: 12, marginTop: 12 },
  kv: { flex: 1, backgroundColor: colors.light, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.12)', padding: 12 },
  kvWide: { marginTop: 12, backgroundColor: colors.light, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.12)', padding: 12 },
  k: { color: colors.textSecondary, fontWeight: '900', fontSize: 12 },
  v: { color: colors.text, fontWeight: '800', marginTop: 6 },
  block: { marginTop: 14, backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  blockTitle: { color: colors.text, fontWeight: '900', fontSize: 14, marginBottom: 10 },
  timeline: { paddingLeft: 6 },
  timelineRow: { position: 'relative', paddingLeft: 18, paddingVertical: 8 },
  dot: { position: 'absolute', left: 0, top: 14, width: 10, height: 10, borderRadius: 5 },
  dotDone: { backgroundColor: colors.success },
  dotTodo: { backgroundColor: 'rgba(148,163,184,0.9)' },
  line: { position: 'absolute', left: 4, top: 24, width: 2, height: 28 },
  lineDone: { backgroundColor: 'rgba(46,204,113,0.35)' },
  lineTodo: { backgroundColor: 'rgba(148,163,184,0.35)' },
  stepText: { fontWeight: '900', fontSize: 12 },
  stepDone: { color: colors.text },
  stepTodo: { color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btnPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  btnPrimaryText: { color: colors.light, fontWeight: '900' },
  btnSecondary: { flex: 1, backgroundColor: colors.light, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(26,42,108,0.18)' },
  btnSecondaryText: { color: colors.primary, fontWeight: '900' },
  btnDisabled: { flex: 1, backgroundColor: 'rgba(148,163,184,0.20)', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  btnDisabledText: { color: colors.textSecondary, fontWeight: '900' },
  infoPill: { flex: 1, backgroundColor: 'rgba(26,42,108,0.08)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12 },
  infoPillText: { color: colors.primary, fontWeight: '900', textAlign: 'center', fontSize: 12 },
  mapWrap: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(26,42,108,0.12)' },
  map: { width: '100%', height: 200 },
  galleryRow: { gap: 10 },
  galleryImg: { width: 120, height: 90, borderRadius: 14, backgroundColor: colors.lightGray },
  muted: { color: colors.textSecondary, fontWeight: '700' },
  emptyCard: { margin: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(26,42,108,0.10)' },
  emptyText: { color: colors.textSecondary, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(26,42,108,0.12)', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(26,42,108,0.10)' },
  modalTitle: { color: colors.text, fontWeight: '900', fontSize: 14 },
  modalCloseBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(26,42,108,0.08)' },
  modalCloseText: { color: colors.primary, fontWeight: '900' },
  modalBody: { padding: 14 },
  modalLabel: { color: colors.textSecondary, fontWeight: '900', fontSize: 12, marginBottom: 8 },
  modalInput: { backgroundColor: colors.light, borderRadius: 14, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 12, paddingVertical: 12, color: colors.text, fontWeight: '700' },
  modalRowBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalBtn: { flex: 1, backgroundColor: 'rgba(26,42,108,0.08)', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  modalBtnText: { color: colors.primary, fontWeight: '900' },
  modalHint: { marginTop: 10, color: colors.textSecondary, fontWeight: '800' },
  modalSubmit: { marginTop: 14, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { color: colors.light, fontWeight: '900' }
});

