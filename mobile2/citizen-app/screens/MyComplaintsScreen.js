import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Image, ScrollView, Alert, Platform, StatusBar } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import client, { API_URL } from '../api/client';
import { translations } from '../constants/translations';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
};

export default function MyComplaintsScreen({ onBack, lang, filter = 'all' }) {
  const t = translations[lang || 'english'];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [assets, setAssets] = useState([]);
  const [feedbackSelected, setFeedbackSelected] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const fetchComplaints = async () => {
    try {
      const endpoint = filter === 'community' ? '/complaints/public' : '/complaints/my-complaints';
      const res = await client.get(endpoint);
      setItems(res.data?.complaints || []);
    } catch (e) {
      console.log('Error fetching complaints:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const getPriorityColor = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'critical') return '#e53e3e';
    if (p === 'high') return '#f6ad55';
    if (p === 'medium') return '#4299e1';
    return '#48bb78';
  };

  const getStatusLabel = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'Submitted';
    if (s === 'in-progress' || s === 'progress') return 'In Progress';
    if (s === 'assigned') return 'Assigned';
    if (s === 'resolved' || s === 'completed') return 'Resolved';
    return status || 'Pending';
  };

  const handleAddEvidence = async (item) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload evidence.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 5,
      mediaTypes: ImagePicker.MediaTypeOptions.All
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAssets(result.assets);
      setSelected(item);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{filter === 'community' ? 'Community Feed' : 'My Complaints'}</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={onRefresh}>
          <Feather name="refresh-cw" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0056D2" />
        </View>
      ) : items.length > 0 ? (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(item) => item._id}
          onRefresh={onRefresh}
          refreshing={refreshing}
          renderItem={({ item }) => {
            const hasEvidence = Array.isArray(item.evidence) && item.evidence.length > 0;
            const hasMedia = Array.isArray(item.media) && item.media.length > 0;
            const titleLabel = item.department || item.service || item.category || 'Complaint';
            const hasFeedback = !!item.feedback && (item.feedback.rating || item.feedback.comment);
            
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>{item.priority?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.complaintId}>ID: #{item.complaintId}</Text>
                </View>

                <Text style={styles.cardTitle}>{titleLabel}</Text>
                <Text style={styles.cardDescription} numberOfLines={3}>{item.description}</Text>
                
                <View style={styles.metaRow}>
                   <View style={styles.metaItem}>
                      <Feather name="clock" size={12} color="#a0aec0" />
                      <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
                   </View>
                   <View style={styles.metaItem}>
                      <View style={[styles.statusDot, { backgroundColor: item.status === 'resolved' ? '#48bb78' : '#4299e1' }]} />
                      <Text style={styles.metaText}>{getStatusLabel(item.status)}</Text>
                   </View>
                </View>

                {(hasMedia || hasEvidence) && (
                  <View style={styles.mediaContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {item.media && item.media.map((m, i) => (
                        <Image key={`m-${i}`} source={{ uri: getImageUrl(m.url) }} style={styles.mediaThumb} />
                      ))}
                      {item.evidence && item.evidence.map((e, i) => 
                        e.files && e.files.map((f, j) => (
                          <Image key={`e-${i}-${j}`} source={{ uri: getImageUrl(f.url) }} style={styles.mediaThumb} />
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}

                {filter !== 'community' && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleAddEvidence(item)}>
                      <Feather name="plus-circle" size={16} color="#0056D2" />
                      <Text style={styles.actionBtnText}>Add Evidence</Text>
                    </TouchableOpacity>
                    
                    {String(item.status || '').toLowerCase() === 'resolved' && !hasFeedback && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { marginLeft: 15 }]}
                        onPress={() => {
                          setFeedbackSelected(item);
                          setFeedbackRating(5);
                          setFeedbackComment('');
                        }}
                      >
                        <Feather name="star" size={16} color="#48bb78" />
                        <Text style={[styles.actionBtnText, { color: '#48bb78' }]}>Rate Officer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="file-document-outline" size={80} color="#cbd5e0" />
          <Text style={styles.emptyText}>{filter === 'community' ? 'No community reports yet' : 'You have no complaints'}</Text>
        </View>
      )}

      {/* Modals/Overlays for Evidence and Feedback */}
      {selected && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Evidence: #{selected.complaintId}</Text>
            <TouchableOpacity style={styles.uploadArea} onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, selectionLimit: 5 });
              if (!result.canceled) setAssets(result.assets || []);
            }}>
              <Feather name="upload-cloud" size={30} color="#0056D2" />
              <Text style={styles.uploadText}>Select Photos/Videos</Text>
            </TouchableOpacity>
            
            <ScrollView horizontal style={styles.assetPreview}>
              {assets.map((a, i) => <Image key={i} source={{ uri: a.uri }} style={styles.previewThumb} />)}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSelected(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={async () => {
                try {
                  const form = new FormData();
                  assets.forEach((a, i) => form.append('evidence', { uri: a.uri, name: `ev_${i}.jpg`, type: 'image/jpeg' }));
                  await client.post(`/complaints/${selected._id}/citizen-evidence`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
                  setSelected(null);
                  fetchComplaints();
                } catch (e) {}
              }}>
                <Text style={styles.submitText}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {feedbackSelected && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Resolution</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setFeedbackRating(n)}>
                  <Ionicons name={n <= feedbackRating ? "star" : "star-outline"} size={36} color="#ecc94b" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              placeholder="Write your experience..."
              multiline
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setFeedbackSelected(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={async () => {
                try {
                  await client.post(`/complaints/${feedbackSelected._id}/feedback`, { rating: feedbackRating, comment: feedbackComment });
                  setFeedbackSelected(null);
                  fetchComplaints();
                } catch (e) {}
              }}>
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 18, 
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 10, fontWeight: '800' },
  complaintId: { fontSize: 12, color: '#a0aec0', fontWeight: '700' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#2d3748', marginBottom: 8 },
  cardDescription: { fontSize: 14, color: '#718096', lineHeight: 22, marginBottom: 15 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#718096', fontWeight: '600' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  
  mediaContainer: { marginBottom: 15 },
  mediaThumb: { width: 90, height: 90, borderRadius: 12, marginRight: 10, backgroundColor: '#f0f4f8' },
  
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f4f8', paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#0056D2' },
  
  emptyText: { marginTop: 15, fontSize: 16, color: '#a0aec0', fontWeight: '600' },

  /* Modal Styles */
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 25, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a202c', marginBottom: 20 },
  uploadArea: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#e2e8f0', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 15 },
  uploadText: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#0056D2' },
  assetPreview: { flexDirection: 'row', marginBottom: 20 },
  previewThumb: { width: 60, height: 60, borderRadius: 10, marginRight: 10 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 20 },
  modalSubmit: { backgroundColor: '#0056D2', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  cancelText: { color: '#718096', fontWeight: '700' },
  submitText: { color: '#fff', fontWeight: '700' },
  
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  feedbackInput: { backgroundColor: '#f7fafc', borderRadius: 12, padding: 15, height: 100, textAlignVertical: 'top', marginBottom: 20, fontSize: 15, color: '#2d3748' }
});
