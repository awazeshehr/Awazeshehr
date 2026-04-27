import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, ScrollView, RefreshControl } from 'react-native';
import client from '../api/client';
import { translations } from '../constants/translations';

export default function HomeScreen({ onSubmit, onMyComplaints, onNotifications, onLogout, onChatbot, onChatWithOfficer, lang, setLang }) {
  const t = translations[lang || 'english'];
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await client.get('/complaints/my-complaints');
      const complaints = res.data?.complaints || [];
      setItems(complaints.slice(0, 5));
      const total = complaints.length;
      const pending = complaints.filter(c => (c.status || '').toLowerCase() === 'pending').length;
      const inProgress = complaints.filter(c => {
        const s = (c.status || '').toLowerCase();
        return s === 'in-progress' || s === 'progress';
      }).length;
      const resolved = complaints.filter(c => (c.status || '').toLowerCase() === 'resolved' || (c.status || '').toLowerCase() === 'completed').length;
      setStats({ total, pending, inProgress, resolved });
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleLang = () => {
    setLang(lang === 'english' ? 'urdu' : 'english');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Image source={require('../assets/icon.png')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>{t.appTitle}</Text>
        </View>
        <View style={styles.headerRight}>
            <TouchableOpacity style={styles.langBtn} onPress={toggleLang}>
                <Text style={styles.langBtnText}>{lang === 'english' ? 'اردو' : 'EN'}</Text>
            </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onNotifications}><Text style={styles.iconText}>🔔</Text></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onLogout}><Text style={styles.iconText}>⎋</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statPrimary]}>
            <Text numberOfLines={1} style={styles.statLabel}>{t.total}</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
            </View>
            <View style={[styles.statCard, styles.statPending]}>
            <Text numberOfLines={1} style={styles.statLabel}>{t.pending}</Text>
            <Text style={styles.statValue}>{stats.pending}</Text>
            </View>
            <View style={[styles.statCard, styles.statProgress]}>
            <Text numberOfLines={1} style={styles.statLabel}>{t.inProgress}</Text>
            <Text style={styles.statValue}>{stats.inProgress}</Text>
            </View>
            <View style={[styles.statCard, styles.statResolved]}>
            <Text numberOfLines={1} style={styles.statLabel}>{t.resolved}</Text>
            <Text style={styles.statValue}>{stats.resolved}</Text>
            </View>
        </View>


        <View style={styles.mainActionsRow}>
            <TouchableOpacity style={[styles.mainActionBtn, styles.btnNew]} onPress={onSubmit}>
                <Text style={styles.btnNewText}>+ {t.newComplaint}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mainActionBtn, styles.btnMy]} onPress={onMyComplaints}>
                <Text style={styles.btnMyText}>{t.myComplaints}</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.toolbarRow}>
            <Text style={styles.sectionTitle}>{t.recentComplaints}</Text>
        </View>

        {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
            <View>
                {items.map(item => {
                    const cat = String(item.category || 'other').toLowerCase();
                    const cardTypeStyle =
                    cat === 'water' ? styles.cardWater :
                    cat === 'electricity' ? styles.cardElectricity :
                    cat === 'sanitation' ? styles.cardSanitation :
                    cat === 'roads' ? styles.cardRoads :
                    cat === 'waste' ? styles.cardWaste :
                    styles.cardOther;
                    return (
                        <View key={item._id} style={[styles.card, cardTypeStyle]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.complaintId} • {item.category}</Text>
                                <Text style={styles.cardStatus}>{item.status}</Text>
                            </View>
                            <Text style={styles.cardText}>{item.description}</Text>
                            <View style={styles.cardFooter}>
                                <Text style={styles.cardMeta}>{t.priority}: {item.priority}</Text>
                                <TouchableOpacity style={styles.officerChatBtn} onPress={() => onChatWithOfficer(item._id)}>
                                    <Text style={styles.officerChatText}>💬 {t.chatWithOfficer}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fabBtn} onPress={onChatbot}>
        <Text style={styles.fabIcon}>🤖</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', elevation: 2 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 32, height: 32, marginRight: 8, borderRadius: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#2d3748' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  langBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#e2e8f0', borderRadius: 8, marginRight: 8 },
  langBtnText: { fontSize: 12, fontWeight: '700', color: '#4a5568' },
  iconBtn: { backgroundColor: '#edf2f7', borderRadius: 10, padding: 8, marginLeft: 8 },
  iconText: { fontSize: 18, color: '#2d3748' },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2d3748' },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  mainActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginVertical: 12 },
  mainActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  btnNew: { backgroundColor: '#667eea' },
  btnNewText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnMy: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#667eea' },
  btnMyText: { color: '#667eea', fontWeight: '700', fontSize: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, marginHorizontal: 4, padding: 12, borderRadius: 12, alignItems: 'center' },
  statLabel: { color: '#fff', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statPrimary: { backgroundColor: '#667eea' },
  statPending: { backgroundColor: '#f6ad55' },
  statProgress: { backgroundColor: '#63b3ed' },
  statResolved: { backgroundColor: '#48bb78' },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4a5568',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  fabIcon: {
    fontSize: 28,
  },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginVertical: 8, borderColor: '#e2e8f0', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardWater: { borderLeftColor: '#3B82F6', borderLeftWidth: 4 },
  cardElectricity: { borderLeftColor: '#F59E0B', borderLeftWidth: 4 },
  cardSanitation: { borderLeftColor: '#10B981', borderLeftWidth: 4 },
  cardRoads: { borderLeftColor: '#6B7280', borderLeftWidth: 4 },
  cardWaste: { borderLeftColor: '#8B5CF6', borderLeftWidth: 4 },
  cardOther: { borderLeftColor: '#A0AEC0', borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontWeight: '700', fontSize: 15, color: '#2d3748' },
  cardStatus: { fontSize: 12, fontWeight: '700', color: '#718096', backgroundColor: '#edf2f7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  cardText: { color: '#4a5568', marginBottom: 12, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f7fafc', paddingTop: 12 },
  cardMeta: { color: '#a0aec0', fontSize: 13, fontWeight: '600' },
  officerChatBtn: { backgroundColor: '#ebf4ff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  officerChatText: { color: '#5a67d8', fontSize: 12, fontWeight: '700' },
  actionsRow: { marginTop: 20 },
  btn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#667eea' },
  btnText: { color: '#667eea', fontWeight: '700', fontSize: 16 }
});