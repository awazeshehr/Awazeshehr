import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../api/client';
import { translations } from '../constants/translations';

export default function ProfileScreen({ onBack, onLogout, lang }) {
  const t = translations[lang || 'english'];
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    areaType: 'Urban',
    sector: '',
    ruralJurisdiction: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await client.get('/auth/me');
      const userData = res.data?.user || res.data;
      setUser(userData);
      setFormData({
        fullName: userData.fullName || '',
        phone: userData.phone || '',
        areaType: userData.areaType || 'Urban',
        sector: userData.sector || '',
        ruralJurisdiction: userData.ruralJurisdiction || ''
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load profile");
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await client.put('/auth/update-profile', formData);
      if (res.data.success) {
        setUser(res.data.user);
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", e.response?.data?.message || "Failed to update profile");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0056D2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Profile' : 'Profile'}</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Feather name="edit-3" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle-outline" size={100} color="#0056D2" />
          </View>
          <Text style={styles.userName}>{user?.fullName || 'User Name'}</Text>
          <Text style={styles.userRole}>{user?.role?.toUpperCase() || 'CITIZEN'}</Text>
        </View>

        {!isEditing && (
          <View style={styles.rewardCard}>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardLabel}>Reward Points</Text>
              <Text style={styles.rewardValue}>245</Text>
            </View>
            <View style={styles.rewardBadge}>
              <MaterialCommunityIcons name="medal" size={24} color="#ecc94b" />
              <Text style={styles.badgeText}>Gold Citizen</Text>
            </View>
          </View>
        )}

        {isEditing ? (
          <View style={styles.editForm}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              placeholder="Enter full name"
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="03xxxxxxxxx"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Area Type</Text>
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.chip, formData.areaType === 'Urban' && styles.activeChip]} 
                onPress={() => setFormData({ ...formData, areaType: 'Urban' })}
              >
                <Text style={[styles.chipText, formData.areaType === 'Urban' && styles.activeChipText]}>Urban</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chip, formData.areaType === 'Rural' && styles.activeChip]} 
                onPress={() => setFormData({ ...formData, areaType: 'Rural' })}
              >
                <Text style={[styles.chipText, formData.areaType === 'Rural' && styles.activeChipText]}>Rural</Text>
              </TouchableOpacity>
            </View>

            {formData.areaType === 'Urban' ? (
              <>
                <Text style={styles.inputLabel}>Sector</Text>
                <TextInput
                  style={styles.input}
                  value={formData.sector}
                  onChangeText={(text) => setFormData({ ...formData, sector: text })}
                  placeholder="e.g. G-11"
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Rural Jurisdiction</Text>
                <TextInput
                  style={styles.input}
                  value={formData.ruralJurisdiction}
                  onChangeText={(text) => setFormData({ ...formData, ruralJurisdiction: text })}
                  placeholder="e.g. Bhara Kahu"
                />
              </>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Feather name="mail" size={20} color="#718096" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Feather name="phone" size={20} color="#718096" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{user?.phone || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Feather name="credit-card" size={20} color="#718096" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>CNIC</Text>
                <Text style={styles.infoValue}>{user?.cnic || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Feather name="map-pin" size={20} color="#718096" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {user?.areaType === 'Urban' ? `Urban (${user?.sector})` : `Rural (${user?.ruralJurisdiction})`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {!isEditing && (
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#0056D2',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  backBtn: { padding: 5 },
  content: { padding: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: { marginBottom: 10 },
  userName: { fontSize: 22, fontWeight: '800', color: '#1a202c' },
  userRole: { fontSize: 14, color: '#718096', fontWeight: '700', marginTop: 5 },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  rewardInfo: { flex: 1 },
  rewardLabel: { fontSize: 12, color: '#a0aec0', fontWeight: '800', textTransform: 'uppercase' },
  rewardValue: { fontSize: 24, fontWeight: '800', color: '#0056D2', marginTop: 2 },
  rewardBadge: { alignItems: 'center', backgroundColor: '#fffaf0', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: '#fef3c7' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#b7791f', marginTop: 4 },
  infoSection: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 30, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  infoTextContainer: { marginLeft: 15 },
  infoLabel: { fontSize: 12, color: '#a0aec0', fontWeight: '700' },
  infoValue: { fontSize: 16, color: '#2d3748', fontWeight: '600', marginTop: 2 },
  logoutBtn: { backgroundColor: '#ff4d4d', borderRadius: 15, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  /* Edit Form Styles */
  editForm: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#4a5568', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#f7fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, color: '#2d3748' },
  row: { flexDirection: 'row', gap: 10, marginTop: 5 },
  chip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  activeChip: { backgroundColor: '#0056D2', borderColor: '#0056D2' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#718096' },
  activeChipText: { color: '#fff' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 30 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e0' },
  saveBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#0056D2' },
  cancelText: { fontWeight: '700', color: '#718096' },
  saveText: { fontWeight: '800', color: '#fff' }
});
