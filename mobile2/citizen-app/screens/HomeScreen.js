import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl, Platform, StatusBar, Dimensions, Alert } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { translations } from '../constants/translations';

const { width } = Dimensions.get('window');

export default function HomeScreen({ onSubmit, onMyComplaints, onNotifications, onLogout, onChatbot, onChatWithOfficer, onProfile, onMap, lang, setLang }) {
  const t = translations[lang || 'english'];
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [latestComplaint, setLatestComplaint] = useState(null);
  const [location, setLocation] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  const requestLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Permission Denied",
          "Awaz-e-Shehr needs location access to help you report issues in your exact area. Please enable it from settings.",
          [{ text: "OK" }]
        );
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
      console.log("Current User Location:", currentLocation.coords);
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  const fetchData = async () => {
    try {
      const res = await client.get('/complaints/my-complaints');
      const complaints = res.data?.complaints || [];
      setItems(complaints.slice(0, 4));
      
      // Find latest non-resolved/non-completed complaint for the "Track Status" section
      const active = complaints.find(c => {
        const s = (c.status || '').toLowerCase();
        return s !== 'resolved' && s !== 'completed' && s !== 'rejected';
      }) || complaints[0];
      setLatestComplaint(active);
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    requestLocationPermission();
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusStep = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 1;
    if (s === 'in-progress' || s === 'progress') return 2;
    if (s === 'assigned') return 3;
    if (s === 'resolved' || s === 'completed') return 4;
    return 1;
  };

  const getStatusLabel = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'Submitted';
    if (s === 'in-progress' || s === 'progress') return 'In Progress';
    if (s === 'assigned') return 'Assigned';
    if (s === 'resolved' || s === 'completed') return 'Resolved';
    if (s === 'rejected') return 'Rejected';
    return 'Closed';
  };

  const getCategoryIcon = (category) => {
    const cat = String(category || 'other').toLowerCase();
    if (cat.includes('light')) return 'lightbulb';
    if (cat.includes('water')) return 'faucet';
    if (cat.includes('garbage') || cat.includes('waste')) return 'trash-2';
    if (cat.includes('road') || cat.includes('pothole')) return 'truck';
    return 'alert-circle';
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'resolved' || s === 'completed') return '#48bb78';
    if (s === 'in-progress' || s === 'progress') return '#4299e1';
    if (s === 'pending') return '#4299e1';
    if (s === 'assigned') return '#48bb78';
    return '#718096';
  };

  const getCategoryIconName = (category) => {
    const cat = String(category || 'other').toLowerCase();
    if (cat.includes('light')) return 'lightbulb';
    if (cat.includes('water')) return 'faucet';
    if (cat.includes('garbage') || cat.includes('waste')) return 'trash-2';
    if (cat.includes('road') || cat.includes('pothole')) return 'truck';
    return 'alert-circle';
  };

  const getCategoryIconColor = (category) => {
    const cat = String(category || 'other').toLowerCase();
    if (cat.includes('light')) return '#2b6cb0';
    if (cat.includes('water')) return '#2b6cb0';
    if (cat.includes('garbage') || cat.includes('waste')) return '#2b6cb0';
    if (cat.includes('road') || cat.includes('pothole')) return '#2b6cb0';
    return '#2b6cb0';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. Header is now fixed at the top */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.menuIcon} onPress={toggleDrawer}>
            <Feather name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Awaz-e-Shehr</Text>
            <Text style={styles.headerSubtitle}>Your Voice, Our City</Text>
          </View>
          <TouchableOpacity style={styles.bellIcon} onPress={onNotifications}>
            <View>
              <Feather name="bell" size={24} color="#fff" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. ScrollView starts BELOW the header, no negative margin */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hello Citizen Card - Now fully visible */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeTextColumn}>
            <Text style={styles.welcomeTitle}>Hello, Citizen!</Text>
            <Text style={styles.welcomeSubtitle}>Together, let's build{"\n"}a better city.</Text>
          </View>
          <View style={styles.welcomeIconContainer}>
            <MaterialCommunityIcons name="city-variant-outline" size={100} color="#e6f0ff" style={styles.cityBgIcon} />
            <Ionicons name="wifi-outline" size={20} color="#cbd5e0" style={styles.wifiIcon} />
          </View>
        </View>

        {/* Submit Complaint Button Card */}
        <TouchableOpacity style={styles.submitComplaintBtn} onPress={onSubmit}>
          <View style={styles.submitIconBg}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={28} color="#0056D2" />
          </View>
          <View style={styles.submitTextContainer}>
            <Text style={styles.submitTitle}>Submit Complaint</Text>
            <Text style={styles.submitSubtitle}>Report an issue in your city</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Quick Actions: Emergency & Community */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: '#fff5f5', borderColor: '#feb2b2' }]} 
            onPress={() => {
              Alert.alert(
                "Emergency Report",
                "Is this a life-threatening emergency or urgent hazard (e.g. live wire)?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "YES, REPORT", onPress: () => onSubmit({ isEmergency: true }) }
                ]
              );
            }}
          >
            <View style={[styles.qaIconCircle, { backgroundColor: '#fed7d7' }]}>
              <MaterialCommunityIcons name="alert-decagram" size={24} color="#c53030" />
            </View>
            <Text style={[styles.qaTitle, { color: '#c53030' }]}>Emergency</Text>
            <Text style={styles.qaSubtitle}>Quick Report</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: '#f0fff4', borderColor: '#9ae6b4' }]}
            onPress={() => onMyComplaints({ filter: 'community' })}
          >
            <View style={[styles.qaIconCircle, { backgroundColor: '#c6f6d5' }]}>
              <MaterialCommunityIcons name="account-group-outline" size={24} color="#2f855a" />
            </View>
            <Text style={[styles.qaTitle, { color: '#2f855a' }]}>Community</Text>
            <Text style={styles.qaSubtitle}>Local Feed</Text>
          </TouchableOpacity>
        </View>

        {/* Track Status Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Track Status</Text>
          <TouchableOpacity onPress={onMyComplaints}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {latestComplaint ? (
          <View style={styles.trackCard}>
            <View style={styles.trackHeader}>
              <Text style={styles.complaintIdText}>Complaint ID: #{latestComplaint.complaintId}</Text>
              <View style={[styles.statusBadge, { backgroundColor: '#e6fffa' }]}>
                <Text style={[styles.statusBadgeText, { color: '#38b2ac' }]}>
                  {getStatusLabel(latestComplaint.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.trackComplaintTitle}>{latestComplaint.category || 'General Issue'}</Text>
            
            {/* Horizontal Stepper */}
            <View style={styles.stepper}>
              {[1, 2, 3, 4].map((step, idx) => {
                const currentStep = getStatusStep(latestComplaint.status);
                const isCompleted = step < currentStep;
                const isCurrent = step === currentStep;
                const labels = ['Submitted', 'In Progress', 'Assigned', 'Resolved'];
                const dates = [
                   new Date(latestComplaint.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                   isCompleted || isCurrent ? 'Active' : '--',
                   isCompleted || isCurrent ? 'Pending' : '--',
                   '--'
                ];
                return (
                  <View key={step} style={styles.stepColumn}>
                    <View style={styles.stepCircleRow}>
                      {idx > 0 && <View style={[styles.stepLine, step <= currentStep && styles.stepLineActive]} />}
                      <View style={[styles.stepCircle, (isCompleted || isCurrent) && styles.stepCircleActive]}>
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        ) : (
                          <Text style={[styles.stepNumber, isCurrent && styles.stepNumberActive]}>{step}</Text>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.stepLabel, (isCompleted || isCurrent) && styles.stepLabelActive]}>{labels[idx]}</Text>
                    <Text style={styles.stepDate}>{dates[idx]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active complaints</Text>
          </View>
        )}

        {/* Recent Activity Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={onMyComplaints}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#0056D2" style={{ marginVertical: 20 }} />
        ) : items && items.length > 0 ? (
          <View style={styles.activityList}>
            {items.map(item => (
              <TouchableOpacity key={item._id} style={styles.activityItem} onPress={() => onChatWithOfficer(item._id)}>
                <View style={styles.activityIconBox}>
                  <Feather name={getCategoryIconName(item.category)} size={22} color={getCategoryIconColor(item.category)} />
                </View>
                <View style={styles.activityMainText}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{item.category || 'Complaint'}</Text>
                  <Text style={styles.activitySub}>ID: #{item.complaintId}  •  {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </View>
                <View style={[styles.miniStatusBadge, { backgroundColor: getStatusColor(item.status) + '10' }]}>
                   <Text style={[styles.miniStatusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyActivityCard}>
            <Ionicons name="document-text-outline" size={40} color="#cbd5e0" />
            <Text style={styles.emptyActivityText}>No recent complaints found</Text>
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Tab Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="home" size={24} color="#0056D2" />
          <Text style={[styles.navLabel, { color: '#0056D2' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onMyComplaints}>
          <Ionicons name="list-outline" size={24} color="#718096" />
          <Text style={styles.navLabel}>My Complaints</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onMap}>
          <Ionicons name="location-outline" size={24} color="#718096" />
          <Text style={styles.navLabel}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onProfile}>
          <Ionicons name="person-outline" size={24} color="#718096" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <TouchableOpacity 
          style={styles.drawerOverlay} 
          activeOpacity={1} 
          onPress={toggleDrawer}
        >
          <View style={styles.drawerContent}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerUserIcon}>
                <Ionicons name="person" size={40} color="#0056D2" />
              </View>
              <Text style={styles.drawerUserName}>Awaz-e-Shehr</Text>
              <Text style={styles.drawerUserEmail}>Citizen Portal</Text>
            </View>

            <View style={styles.drawerMenu}>
              <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(); }}>
                <Feather name="home" size={22} color="#4a5568" />
                <Text style={styles.drawerLabel}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(); onProfile(); }}>
                <Feather name="user" size={22} color="#4a5568" />
                <Text style={styles.drawerLabel}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(); onMyComplaints(); }}>
                <Feather name="file-text" size={22} color="#4a5568" />
                <Text style={styles.drawerLabel}>My Complaints</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(); onMap(); }}>
                <Feather name="map" size={22} color="#4a5568" />
                <Text style={styles.drawerLabel}>City Map</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(); onNotifications(); }}>
                <Feather name="bell" size={22} color="#4a5568" />
                <Text style={styles.drawerLabel}>Notifications</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(); onChatbot(); }}>
                <Feather name="message-square" size={22} color="#4a5568" />
                <Text style={styles.drawerLabel}>AI Assistant</Text>
              </TouchableOpacity>

              <View style={styles.drawerDivider} />

              <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(); onLogout(); }}>
                <Feather name="log-out" size={22} color="#ff4d4d" />
                <Text style={[styles.drawerLabel, { color: '#ff4d4d' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  blueHeader: {
    backgroundColor: '#0056D2',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20, // Reduced padding to prevent overlap
    paddingHorizontal: 20,
    zIndex: 1,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  notificationBadge: { 
    position: 'absolute', 
    top: -4, 
    right: -4, 
    backgroundColor: '#ff4d4d', 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0056D2'
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }, // Added paddingTop instead of negative margin
  
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
    overflow: 'hidden',
    marginTop: 0, // Removed negative margin
  },
  welcomeTextColumn: { flex: 1, zIndex: 2 },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: '#1a202c' },
  welcomeSubtitle: { fontSize: 16, color: '#718096', marginTop: 8, lineHeight: 24 },
  cityBgIcon: { position: 'absolute', right: -20, bottom: -25, opacity: 0.8 },
  wifiIcon: { position: 'absolute', top: 15, right: 15, opacity: 0.3 },

  submitComplaintBtn: {
    backgroundColor: '#0056D2',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#0056D2',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  submitIconBg: { width: 56, height: 56, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitTextContainer: { flex: 1, marginLeft: 16 },
  submitTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  submitSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },

  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, gap: 15 },
  quickActionCard: { flex: 1, borderRadius: 20, padding: 15, borderWidth: 1, alignItems: 'center', elevation: 2 },
  qaIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  qaTitle: { fontSize: 15, fontWeight: '800' },
  qaSubtitle: { fontSize: 11, color: '#718096', marginTop: 2, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 5 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1a202c' },
  viewAllText: { fontSize: 15, fontWeight: '700', color: '#0056D2' },

  trackCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  trackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  complaintIdText: { fontSize: 14, color: '#a0aec0', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusBadgeText: { fontSize: 12, fontWeight: '800' },
  trackComplaintTitle: { fontSize: 18, fontWeight: '700', color: '#2d3748', marginBottom: 25 },
  
  stepper: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 },
  stepColumn: { alignItems: 'center', flex: 1 },
  stepCircleRow: { width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center', zIndex: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  stepCircleActive: { backgroundColor: '#0056D2', borderColor: '#0056D2' },
  stepNumber: { fontSize: 11, fontWeight: '800', color: '#cbd5e0' },
  stepNumberActive: { color: '#fff' },
  stepLine: { position: 'absolute', right: '50%', width: '100%', height: 3, backgroundColor: '#f0f4f8', zIndex: 1 },
  stepLineActive: { backgroundColor: '#0056D2' },
  stepLabel: { fontSize: 11, color: '#a0aec0', fontWeight: '700', textAlign: 'center' },
  stepLabelActive: { color: '#2d3748' },
  stepDate: { fontSize: 10, color: '#cbd5e0', marginTop: 4, fontWeight: '600' },

  activityList: { gap: 12 },
  activityItem: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 2,
  },
  activityIconBox: { width: 52, height: 52, backgroundColor: '#f0f7ff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  activityMainText: { flex: 1 },
  activityTitle: { fontSize: 16, fontWeight: '700', color: '#2d3748' },
  activitySub: { fontSize: 13, color: '#a0aec0', marginTop: 4, fontWeight: '600' },
  miniStatusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 10 },
  miniStatusText: { fontSize: 11, fontWeight: '800' },

  emptyCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 25 },
  emptyText: { color: '#a0aec0', fontWeight: '#600' },
  emptyActivityCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 30, 
    alignItems: 'center', 
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#edf2f7',
    borderStyle: 'dashed'
  },
  emptyActivityText: { color: '#a0aec0', fontWeight: '600', marginTop: 10 },

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f4f8',
    justifyContent: 'space-around',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 12, fontWeight: '700', color: '#718096', marginTop: 4 },
  
  /* Drawer Styles */
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  drawerContent: {
    width: width * 0.75,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    alignItems: 'center',
    marginBottom: 10,
  },
  drawerUserIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  drawerUserName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a202c',
  },
  drawerUserEmail: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
  },
  drawerMenu: {
    flex: 1,
    padding: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 5,
  },
  drawerLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4a5568',
    marginLeft: 15,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#f0f4f8',
    marginVertical: 15,
    marginHorizontal: 10,
  },
});
