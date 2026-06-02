import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
let MapView, Marker, Callout;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
}
import client from '../api/client';

export default function MapScreen({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [region, setRegion] = useState({
    latitude: 33.6844, // Islamabad default
    longitude: 73.0479,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await client.get('/complaints/public'); 
      setComplaints(res.data?.complaints || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getMarkerColor = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'critical' || p === 'high') return '#e53e3e'; // Red
    if (p === 'medium') return '#ed8936'; // Orange
    return '#4299e1'; // Blue
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>City Issues Map</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {Platform.OS === 'web' ? (
          <View style={styles.placeholder}>
            <Ionicons name="map-outline" size={80} color="#cbd5e0" />
            <Text style={styles.placeholderText}>Map is only available on mobile devices.</Text>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color="#0056D2" />
        ) : (
          <MapView style={styles.map} initialRegion={region}>
            {complaints.map((c, index) => (
              c.location && c.location.lat && (
                <Marker
                  key={index}
                  coordinate={{ latitude: c.location.lat, longitude: c.location.lng }}
                  pinColor={getMarkerColor(c.priority)}
                >
                  <Callout>
                    <View style={styles.callout}>
                      <Text style={styles.calloutTitle}>{c.category}</Text>
                      <Text style={styles.calloutSub}>Status: {c.status}</Text>
                      <Text style={styles.calloutSub}>Priority: {c.priority}</Text>
                    </View>
                  </Callout>
                </Marker>
              )
            ))}
          </MapView>
        )}
        
        {/* Heatmap Legend */}
        {!loading && Platform.OS !== 'web' && (
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#e53e3e' }]} />
              <Text style={styles.legendText}>Critical</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#ed8936' }]} />
              <Text style={styles.legendText}>Medium</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#4299e1' }]} />
              <Text style={styles.legendText}>Normal</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: {
    backgroundColor: '#0056D2',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  backBtn: { padding: 5 },
  content: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  placeholderText: { fontSize: 16, color: '#718096', textAlign: 'center', marginTop: 20 },
  callout: { padding: 10, minWidth: 150 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, color: '#2d3748' },
  calloutSub: { fontSize: 12, color: '#718096', marginTop: 2 },
  legend: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 15,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { fontSize: 12, fontWeight: '700', color: '#4a5568' }
});
