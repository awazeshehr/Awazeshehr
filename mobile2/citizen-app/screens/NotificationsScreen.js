import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../api/client';
import { translations } from '../constants/translations';

export default function NotificationsScreen({ onBack, lang }) {
  const t = translations[lang || 'english'];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await client.get('/notifications');
      setItems(res.data?.notifications || []);
    } catch (e) {
      console.log('Error fetching notifications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const getIcon = (type) => {
    const t = (type || 'info').toLowerCase();
    if (t === 'success') return { name: 'checkmark-circle', color: '#48bb78', bg: '#f0fff4' };
    if (t === 'warning') return { name: 'alert-circle', color: '#ecc94b', bg: '#fffff0' };
    if (t === 'error') return { name: 'close-circle', color: '#f56565', bg: '#fff5f5' };
    return { name: 'notifications', color: '#0056D2', bg: '#f0f7ff' };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Feather name="settings" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0056D2" />
        </View>
      ) : items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          renderItem={({ item }) => {
            const iconData = getIcon(item.type);
            return (
              <TouchableOpacity style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: iconData.bg }]}>
                  <Ionicons name={iconData.name} size={24} color={iconData.color} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardTime}>
                      {new Date(item.createdAt || item.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={styles.cardText}>{item.message}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="bell-off-outline" size={80} color="#cbd5e0" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#0056D2',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    elevation: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  backBtn: { padding: 5 },
  headerIcon: { padding: 5 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  listContent: { padding: 15 },
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#2d3748', flex: 1, marginRight: 10 },
  cardTime: { fontSize: 11, color: '#a0aec0', fontWeight: '600' },
  cardText: { fontSize: 14, color: '#718096', lineHeight: 20 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#a0aec0', fontWeight: '600' }
});
