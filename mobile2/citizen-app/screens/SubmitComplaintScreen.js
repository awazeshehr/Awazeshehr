import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
let MapView, Marker;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome } from '@expo/vector-icons';
import client, { API_URL } from '../api/client';
import { translations } from '../constants/translations';
import { smartRewrite } from '../utils/smartRewriter';

export default function SubmitComplaintScreen({ onBack, lang = 'english', initialIsEmergency = false }) {
  const t = translations[lang];
  const [departments, setDepartments] = useState([]);
  const [availableSectors, setAvailableSectors] = useState([]);
  const [availableJurisdictions, setAvailableJurisdictions] = useState([]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [isEmergency, setIsEmergency] = useState(initialIsEmergency);

  useEffect(() => {
    if (isEmergency) {
      setDescription(lang === 'urdu' ? 'ایمرجنسی: فوری توجہ درکار ہے۔' : 'EMERGENCY: Urgent attention required.');
    }
  }, [isEmergency]);

  const [availableServices, setAvailableServices] = useState([]);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);

  const [areaType, setAreaType] = useState('Urban');
  const [areaOpen, setAreaOpen] = useState(false);
  const [sector, setSector] = useState('');
  const [sectorOpen, setSectorOpen] = useState(false);
  const [ruralJurisdiction, setRuralJurisdiction] = useState('');
  const [jurisdictionOpen, setJurisdictionOpen] = useState(false);

  const [routingRecommendation, setRoutingRecommendation] = useState(null);
  const [isRoutingAnalyzing, setIsRoutingAnalyzing] = useState(false);
  const [departmentManuallySelected, setDepartmentManuallySelected] = useState(false);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('islamabad');
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [region, setRegion] = useState({ latitude: 33.6844, longitude: 73.0479, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [showTip, setShowTip] = useState(true);
  const [isRewriting, setIsRewriting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [depsRes, sectorsRes, jurRes] = await Promise.all([
          client.get('/complaints/data/departments'),
          client.get('/complaints/data/sectors'),
          client.get('/complaints/data/jurisdictions')
        ]);

        if (depsRes.data?.success) setDepartments(depsRes.data.departments || []);
        if (sectorsRes.data?.success) setAvailableSectors(sectorsRes.data.sectors || []);
        if (jurRes.data?.success) setAvailableJurisdictions(jurRes.data.jurisdictions || []);
      } catch (e) {
        Alert.alert(t.error || 'Error', t.serverError || 'Server error');
      }
    })();
  }, [t]);

  useEffect(() => {
    if (selectedDepartmentId) {
      const dep = (departments || []).find(d => String(d?._id || '') === String(selectedDepartmentId || ''));
      if (dep) {
        setAvailableServices(dep.servicesOffered || []);
        setSelectedService('');
      }
    } else {
      setAvailableServices([]);
      setSelectedService('');
    }
  }, [selectedDepartmentId, departments]);

  useEffect(() => {
    if (areaType === 'Urban') {
      setRuralJurisdiction('');
    } else {
      setSector('');
    }
  }, [areaType]);

  useEffect(() => {
    const text = String(description || '').trim();
    if (!text) {
      setRoutingRecommendation(null);
      setIsRoutingAnalyzing(false);
      if (!departmentManuallySelected) setSelectedDepartmentId('');
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setIsRoutingAnalyzing(true);
        const res = await fetch(`${API_URL}/recommend-routing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complaint_text: text })
        });
        if (!res.ok) return;
        const data = await res.json();
        setRoutingRecommendation(data);
        const recId = data?.recommendedDepartment?._id ? String(data.recommendedDepartment._id) : '';
        if (recId && !departmentManuallySelected) {
          setSelectedDepartmentId(recId);
        }
      } catch (e) {
      } finally {
        setIsRoutingAnalyzing(false);
      }
    }, 700);

    return () => clearTimeout(handle);
  }, [description, departmentManuallySelected]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    })();
  }, []);

  const handleRewrite = () => {
    if (!description || !description.trim()) {
      Alert.alert('Validation', 'Please enter a description first');
      return;
    }
    setIsRewriting(true);
    // Simulate AI delay
    setTimeout(() => {
      const improved = smartRewrite(description);
      setDescription(improved);
      setIsRewriting(false);
      Alert.alert('Success', 'Description enhanced');
    }, 1000);
  };

  const submit = async () => {
    if (!coords) {
      Alert.alert('Location', 'Location permission is required');
      return;
    }
    if (!description) {
      Alert.alert('Validation', 'Description is required');
      return;
    }
    if (!selectedDepartmentId) {
      Alert.alert(t.validation || 'Validation', t.selectDepartment || 'Please select a department');
      return;
    }
    if (!selectedService) {
      Alert.alert(t.validation || 'Validation', t.selectService || 'Please select a service');
      return;
    }
    if (areaType === 'Urban' && !sector) {
      Alert.alert(t.validation || 'Validation', t.selectSector || 'Please select an urban sector');
      return;
    }
    if (areaType === 'Rural' && !ruralJurisdiction) {
      Alert.alert(t.validation || 'Validation', t.selectJurisdiction || 'Please select a rural jurisdiction');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('description', description);
      form.append('departmentId', selectedDepartmentId);
      form.append('service', selectedService);
      form.append('isEmergency', isEmergency);
      form.append('location', JSON.stringify({ 
        lat: coords.lat, 
        lng: coords.lng, 
        address, 
        city,
        areaType,
        sector: areaType === 'Urban' ? sector : '',
        ruralJurisdiction: areaType === 'Rural' ? ruralJurisdiction : ''
      }));
      mediaAssets.slice(0,5).forEach((asset, idx) => {
        const uri = asset.uri;
        const name = asset.fileName || `media_${idx}.${(asset.type === 'video' ? 'mp4' : 'jpg')}`;
        const type = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
        form.append('media', { uri, name, type });
      });
      const res = await client.post('/complaints/submit', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success) {
        Alert.alert('Submitted', `Complaint ${res.data.complaint?.complaintId} created`);
        onBack();
      } else {
        Alert.alert('Error', res.data?.message || 'Submission failed');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const searchAddress = async () => {
    if (!searchQuery || searchQuery.trim().length < 3) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(searchQuery.trim())}`;
      const res = await fetch(url, { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'AwazEShehrCitizenApp/1.0'
        } 
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {}
    setSearching(false);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      // 1. Try Native Expo Geocoding first (more reliable on device)
      const locationList = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (locationList.length > 0) {
        const place = locationList[0];
        const parts = [
          place.name,
          place.street,
          place.district,
          place.city,
          place.subregion,
          place.region
        ].filter((p, i, arr) => p && arr.indexOf(p) === i); // Filter truthy and unique
        
        const formatted = parts.join(', ');
        if (formatted) {
          setAddress(formatted);
          setCity((place.city || place.subregion || 'karachi').toLowerCase());
          return;
        }
      }
    } catch (e) {
      console.log('Native geocoding failed, trying fallback...');
    }

    // 2. Fallback to Nominatim (OpenStreetMap)
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'AwazEShehrCitizenApp/1.0' // Required by Nominatim
        } 
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const disp = data?.display_name || '';
      setAddress(disp || 'Location found');
      
      const a = data?.address || {};
      const nextCity = a.city || a.town || a.village || a.state || city;
      setCity(String(nextCity || '').toLowerCase());
    } catch (e) {
      console.log('Reverse geocoding error:', e);
      setAddress('Address unavailable (Check internet)');
    }
  };

  const ActionButton = ({ title, onPress, variant = 'primary' }) => (
    <TouchableOpacity onPress={onPress} style={[styles.btn, variant === 'secondary' ? styles.btnSecondary : styles.btnPrimary]}>
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={styles.headerBackText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Complaint</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.container} nestedScrollEnabled>
        
      <Text style={styles.label}>{t.department || 'Department'}</Text>
      <View style={styles.selectBox}>
        <TouchableOpacity style={styles.selectHeader} onPress={() => setDepartmentOpen(!departmentOpen)}>
          <Text style={styles.selectText}>
            {selectedDepartmentId
              ? (departments.find(d => String(d?._id || '') === String(selectedDepartmentId))?.name || (t.selectDepartment || 'Select department'))
              : (t.selectDepartment || 'Select department')}
          </Text>
          <Text style={styles.selectCaret}>{departmentOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {departmentOpen && (
          <View style={styles.selectMenu}>
            {departments.map((d) => (
              <TouchableOpacity
                key={d._id}
                style={styles.selectItem}
                onPress={() => {
                  setSelectedDepartmentId(String(d._id));
                  setDepartmentManuallySelected(true);
                  setDepartmentOpen(false);
                }}
              >
                <Text style={styles.selectItemText}>{d.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.label}>{t.service || 'Service'}</Text>
      <View style={styles.selectBox}>
        <TouchableOpacity
          style={styles.selectHeader}
          onPress={() => {
            if (!selectedDepartmentId) return;
            setServiceOpen(!serviceOpen);
          }}
        >
          <Text style={styles.selectText}>
            {selectedService
              ? selectedService
              : (selectedDepartmentId ? (t.selectService || 'Select service') : (t.selectDepartmentFirst || 'Select department first'))}
          </Text>
          <Text style={styles.selectCaret}>{serviceOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {serviceOpen && (
          <View style={styles.selectMenu}>
            {(availableServices || []).map((s) => (
              <TouchableOpacity key={String(s)} style={styles.selectItem} onPress={() => { setSelectedService(String(s)); setServiceOpen(false); }}>
                <Text style={styles.selectItemText}>{String(s)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.label}>{t.areaType || 'Area Type'}</Text>
      <View style={styles.selectBox}>
        <TouchableOpacity style={styles.selectHeader} onPress={() => setAreaOpen(!areaOpen)}>
          <Text style={styles.selectText}>{areaType === 'Rural' ? (t.rural || 'Rural') : (t.urban || 'Urban')}</Text>
          <Text style={styles.selectCaret}>{areaOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {areaOpen && (
          <View style={styles.selectMenu}>
            <TouchableOpacity style={styles.selectItem} onPress={() => { setAreaType('Urban'); setAreaOpen(false); }}>
              <Text style={styles.selectItemText}>{t.urban || 'Urban'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectItem} onPress={() => { setAreaType('Rural'); setAreaOpen(false); }}>
              <Text style={styles.selectItemText}>{t.rural || 'Rural'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {areaType === 'Urban' ? (
        <>
          <Text style={styles.label}>{t.sector || 'Sector'}</Text>
          <View style={styles.selectBox}>
            <TouchableOpacity style={styles.selectHeader} onPress={() => setSectorOpen(!sectorOpen)}>
              <Text style={styles.selectText}>{sector ? sector : (t.selectSector || 'Select sector')}</Text>
              <Text style={styles.selectCaret}>{sectorOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {sectorOpen && (
              <View style={styles.selectMenu}>
                {availableSectors.map((s) => (
                  <TouchableOpacity key={s._id} style={styles.selectItem} onPress={() => { setSector(String(s.name || '')); setSectorOpen(false); }}>
                    <Text style={styles.selectItemText}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>{t.ruralJurisdiction || 'Rural Jurisdiction'}</Text>
          <View style={styles.selectBox}>
            <TouchableOpacity style={styles.selectHeader} onPress={() => setJurisdictionOpen(!jurisdictionOpen)}>
              <Text style={styles.selectText}>
                {ruralJurisdiction ? ruralJurisdiction : (t.selectJurisdiction || 'Select jurisdiction')}
              </Text>
              <Text style={styles.selectCaret}>{jurisdictionOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {jurisdictionOpen && (
              <View style={styles.selectMenu}>
                {availableJurisdictions.map((j) => (
                  <TouchableOpacity key={j._id} style={styles.selectItem} onPress={() => { setRuralJurisdiction(String(j.name || '')); setJurisdictionOpen(false); }}>
                    <Text style={styles.selectItemText}>{j.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Describe the issue" multiline />
      <TouchableOpacity 
        style={[styles.btn, styles.aiBtn, (!description.trim() || isRewriting) && styles.btnDisabled]} 
        onPress={handleRewrite}
        disabled={!description.trim() || isRewriting}
      >
        {isRewriting ? (
          <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
        ) : (
          <FontAwesome name="magic" size={14} color="#fff" style={{ marginRight: 8 }} />
        )}
        <Text style={styles.aiBtnText}>
          {isRewriting ? t.rewriting : t.rewriteWithAI}
        </Text>
      </TouchableOpacity>
      {(isRoutingAnalyzing || routingRecommendation?.recommendedDepartment?.name) && (
        <View style={styles.recoBox}>
          <Text style={styles.recoText}>
            {isRoutingAnalyzing
              ? (t.analyzingRouting || 'Analyzing routing...')
              : `${t.recommendedDepartment || 'Recommended Department'}: ${routingRecommendation.recommendedDepartment.name}`}
          </Text>
        </View>
      )}
      <View style={styles.locationRow}>
        <ActionButton title="Use My Location" onPress={async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          setAddress('');
          const pos = await Location.getCurrentPositionAsync({});
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
          await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        }} />
        <Text style={styles.coordsText}>{address || (coords ? 'Fetching location...' : 'Location not set')}</Text>
      </View>
      <View style={styles.searchGroup}>
        <TextInput
          style={[styles.input, styles.searchInput]}
          placeholder="Search for address, landmark, or area..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchAddress}
        />
        <ActionButton title="Search" onPress={searchAddress} variant="primary" />
      </View>
      {searching && <ActivityIndicator />}
      {!!results.length && (
        <View style={styles.resultsBox}>
          {results.map((r, i) => (
            <TouchableOpacity key={`${r.place_id}-${i}`} style={styles.resultItem} onPress={() => {
              const lat = parseFloat(r.lat);
              const lon = parseFloat(r.lon);
              setCoords({ lat, lng: lon });
              setRegion({ latitude: lat, longitude: lon, latitudeDelta: 0.01, longitudeDelta: 0.01 });
              setAddress(r.display_name || '');
              setResults([]);
              setSearchQuery('');
            }}>
              <Text style={styles.resultText}>{r.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.mapWrapper}>
        {Platform.OS !== 'web' && MapView ? (
          <MapView
            style={styles.map}
            initialRegion={region}
            region={region}
            onPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setCoords({ lat: latitude, lng: longitude });
              setRegion((r) => ({ ...r, latitude, longitude }));
              setAddress('');
              reverseGeocode(latitude, longitude);
              setShowTip(false);
            }}
          >
            {coords && Marker && (
              <Marker
                coordinate={{ latitude: coords.lat, longitude: coords.lng }}
                draggable
                onDragEnd={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setCoords({ lat: latitude, lng: longitude });
                  setAddress('');
                  reverseGeocode(latitude, longitude);
                  setShowTip(false);
                }}
              />
            )}
          </MapView>
        ) : (
          <View style={[styles.map, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#666' }}>{Platform.OS === 'web' ? 'Map view is only available on mobile devices.' : 'Map module failed to load.'}</Text>
          </View>
        )}
        {showTip && (
          <View style={styles.tipBox}><Text style={styles.tipText}>Drag to adjust complaint location</Text></View>
        )}
        <View style={styles.actionsInline}>
          <ActionButton title="Center on Me" variant="secondary" onPress={() => {
            if (coords) setRegion({ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
          }} />
        </View>
      </View>
      {!!address && (
        <View style={styles.addressBox}>
          <Text style={styles.addrText}>{address}</Text>
        </View>
      )}
      <Text style={styles.sectionTitle}>Upload Evidence</Text>
      <View style={styles.evidenceBox}>
        <TouchableOpacity style={styles.evidenceDrop} onPress={async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== 'granted') return;
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsMultipleSelection: true,
            selectionLimit: 5,
            mediaTypes: ImagePicker.MediaTypeOptions.All
          });
          if (!result.canceled) {
            setMediaAssets(result.assets || []);
          }
        }}>
          <Text style={styles.evidenceDropText}>Click to upload file</Text>
          <Text style={styles.evidenceDropSub}>PNG, JPG, MP4 up to 15MB</Text>
        </TouchableOpacity>
        {!!mediaAssets.length && (
          <View style={styles.assetsList}>
            {mediaAssets.map((a, i) => (
              <Text key={i} style={styles.assetLabel}>{a.fileName || a.uri}</Text>
            ))}
          </View>
        )}
        <View style={styles.inlineActions}>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => setMediaAssets([])}>
            <Text style={styles.btnTextSecondary}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
        <View style={styles.actions}>
          <ActionButton title={loading ? 'Submitting...' : 'Submit'} onPress={submit} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 24, paddingBottom: 40, paddingTop: 72 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderBottomColor: '#e2e8f0', borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1000, elevation: 6 },
  headerBack: { paddingVertical: 8, paddingHorizontal: 4 },
  headerBackText: { color: '#667eea', fontWeight: '600', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  label: { marginTop: 8, color: '#444' },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 8, padding: 12, marginVertical: 8 },
  textarea: { minHeight: 100 },
  actions: { marginTop: 8 },
  actionsInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  selectBox: { marginVertical: 6 },
  selectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: '#d6d9e0', borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff' },
  selectText: { color: '#2d3748', fontWeight: '600' },
  selectCaret: { color: '#2d3748', fontWeight: '800' },
  selectMenu: { marginTop: 6, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  selectItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomColor: '#eee', borderBottomWidth: 1 },
  selectItemText: { color: '#2d3748' },
  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coordsText: { marginLeft: 12, color: '#666', flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  mapWrapper: { marginTop: 10 },
  map: { height: 350, borderRadius: 20, borderColor: '#e2e8f0', borderWidth: 2, overflow: 'hidden' },
  searchGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchInput: { flex: 1, marginRight: 8 },
  resultsBox: { backgroundColor: '#fff', borderRadius: 12, borderColor: '#e2e8f0', borderWidth: 1, marginVertical: 6, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  resultItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomColor: '#eee', borderBottomWidth: 1 },
  resultText: { color: '#2d3748' },
  tipBox: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, borderColor: '#e2e8f0', borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  tipText: { color: '#2d3748' },
  addressBox: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, borderColor: '#e2e8f0', borderWidth: 1, padding: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  addrText: { color: '#2d3748' },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, minWidth: 120, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#667eea', elevation: 2, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  btnSecondary: { backgroundColor: '#edf2f7' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextSecondary: { color: '#2d3748', fontWeight: '600' },
  evidenceBox: { backgroundColor: '#fff', borderRadius: 12, borderColor: '#e2e8f0', borderWidth: 1, padding: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  evidenceDrop: { borderColor: '#cbd5e0', borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  evidenceDropText: { color: '#2d3748', fontWeight: '700' },
  evidenceDropSub: { color: '#718096', marginTop: 6 },
  assetsList: { marginTop: 10 },
  assetLabel: { color: '#2d3748', marginBottom: 4 },
  aiBtn: { backgroundColor: '#a777e3', alignSelf: 'flex-end', marginTop: -4, marginBottom: 12, paddingVertical: 8, paddingHorizontal: 12, minWidth: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  aiBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  recoBox: { marginTop: 8, marginBottom: 6, backgroundColor: '#f7fafc', borderRadius: 12, borderColor: '#e2e8f0', borderWidth: 1, padding: 10 },
  recoText: { color: '#2d3748', fontWeight: '600' }
});
