import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import client from '../api/client';

import { translations } from '../constants/translations';
import colors from '../constants/colors';

export default function NotificationsScreen({ onBack, lang }) {
  const t = translations[lang || 'english'];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get('/notifications');
        setItems(res.data?.notifications || []);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t.back || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.notifications || 'Notifications'}</Text>
      </View>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => String(item?._id || item?.id || idx)}
          renderItem={({ item }) => {
            const type = (item.type || 'info').toLowerCase();
            const icon = type === 'success' ? '✓' : type === 'error' ? '!' : type === 'warning' ? '!' : 'i';
            const cardTypeStyle =
              type === 'success' ? styles.cardSuccess :
              type === 'error' ? styles.cardError :
              type === 'warning' ? styles.cardWarning :
              styles.cardInfo;
            const iconTypeStyle =
              type === 'success' ? styles.iconSuccess :
              type === 'error' ? styles.iconError :
              type === 'warning' ? styles.iconWarning :
              styles.iconInfo;
            return (
              <View style={[styles.card, cardTypeStyle]}>
                <View style={[styles.iconCircle, iconTypeStyle]}>
                  <Text style={styles.iconText}>{icon}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardText}>{item.message}</Text>
                  <Text style={styles.cardMeta}>{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
      <View style={styles.actions}>
         {/* Back button moved to header */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(26,42,108,0.10)' },
  backButton: { marginRight: 16, padding: 4 },
  backButtonText: { fontSize: 16, color: colors.primary, fontWeight: '900' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  listContent: { padding: 20, paddingBottom: 40 },
  loader: { marginTop: 50 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12, display: 'none' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginVertical: 10, borderColor: 'rgba(26,42,108,0.10)', borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: '600', marginBottom: 6 },
  cardText: { color: colors.textSecondary },
  cardMeta: { color: colors.placeholder, marginTop: 6 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconText: { fontSize: 18, fontWeight: '700' },
  iconSuccess: { backgroundColor: '#C6F6D5' },
  iconInfo: { backgroundColor: '#DBEAFE' },
  iconWarning: { backgroundColor: '#FEEBC8' },
  iconError: { backgroundColor: '#FED7D7' },
  cardSuccess: { borderLeftColor: '#48BB78', borderLeftWidth: 4 },
  cardInfo: { borderLeftColor: '#3B82F6', borderLeftWidth: 4 },
  cardWarning: { borderLeftColor: '#F59E0B', borderLeftWidth: 4 },
  cardError: { borderLeftColor: '#F87171', borderLeftWidth: 4 },
  actions: { marginTop: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  btnSecondary: { backgroundColor: '#edf2f7' },
  btnTextSecondary: { color: '#2d3748', fontWeight: '600' }
});
