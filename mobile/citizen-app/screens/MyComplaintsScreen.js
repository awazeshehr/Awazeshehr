import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import client, { API_URL } from '../api/client';

import { translations } from '../constants/translations';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
};

export default function MyComplaintsScreen({ onBack, lang }) {
  const t = translations[lang || 'english'];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [assets, setAssets] = useState([]);
  const [feedbackSelected, setFeedbackSelected] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

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

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get('/complaints/my-complaints');
        setItems(res.data?.complaints || []);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Complaints</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const hasEvidence = Array.isArray(item.evidence) && item.evidence.length > 0;
            const hasMedia = Array.isArray(item.media) && item.media.length > 0;
            const pri = String(item.priority || '').toLowerCase();
            const cardTypeStyle =
              pri === 'critical' ? styles.cardCritical :
              pri === 'high' ? styles.cardHigh :
              pri === 'medium' ? styles.cardMedium :
              pri === 'low' ? styles.cardLow :
              styles.cardOther;
            const titleLabel = item.department || item.service || item.category || 'Complaint';
            const hasFeedback = !!item.feedback && (item.feedback.rating || item.feedback.comment);
            return (
              <View style={[styles.card, cardTypeStyle]}>
                <Text style={styles.cardTitle}>{item.complaintId} • {titleLabel}</Text>
                <Text style={styles.cardText}>{item.description}</Text>
                {!!item.service && <Text style={styles.cardMeta}>Service: {item.service}</Text>}
                <Text style={styles.cardMeta}>Status: {item.status} • Priority: {item.priority}</Text>
                
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

                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => handleAddEvidence(item)}>
                    <Text style={styles.btnText}>{hasEvidence || hasMedia ? 'Add More Evidence' : 'Add Evidence'}</Text>
                  </TouchableOpacity>
                  {String(item.status || '').toLowerCase() === 'resolved' && (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnSecondary, { marginTop: 8 }]}
                      onPress={() => {
                        if (hasFeedback) {
                          Alert.alert(t.info || 'Info', 'Feedback already submitted');
                          return;
                        }
                        setFeedbackSelected(item);
                        setFeedbackRating(5);
                        setFeedbackComment('');
                      }}
                    >
                      <Text style={styles.btnTextSecondary}>{hasFeedback ? 'Feedback Submitted' : 'Rate Resolution'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
      {selected && (
        <View style={styles.evidenceBox}>
          <Text style={styles.subTitle}>{t.addEvidence}: {selected.complaintId}</Text>
          <View style={styles.inlineActions}>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                allowsMultipleSelection: true,
                selectionLimit: 5,
                mediaTypes: ImagePicker.MediaTypeOptions.All
              });
              if (!result.canceled) {
                setAssets(result.assets || []);
              }
            }}>
              <Text style={styles.btnTextSecondary}>Change Selection</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => setAssets([])}>
              <Text style={styles.btnTextSecondary}>{t.clear}</Text>
            </TouchableOpacity>
          </View>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10}}>
            {assets.map((a, i) => (
              <Image 
                key={i} 
                source={{ uri: a.uri }} 
                style={{width: 60, height: 60, borderRadius: 8}} 
              />
            ))}
          </View>
          <View style={styles.inlineActions}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={async () => {
              try {
                const form = new FormData();
                assets.slice(0,5).forEach((asset, idx) => {
                  const uri = asset.uri;
                  const name = asset.fileName || `evidence_${idx}.${(asset.type === 'video' ? 'mp4' : 'jpg')}`;
                  const type = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
                  form.append('evidence', { uri, name, type });
                });
                const res = await client.post(`/complaints/${selected._id}/citizen-evidence`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (res.data?.success) {
                  setSelected(null);
                  const refreshed = await client.get('/complaints/my-complaints');
                  setItems(refreshed.data?.complaints || []);
                }
              } catch (e) {}
            }}>
              <Text style={styles.btnText}>{t.submit}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => setSelected(null)}>
              <Text style={styles.btnTextSecondary}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {feedbackSelected && (
        <View style={styles.evidenceBox}>
          <Text style={styles.subTitle}>Rate Resolution: {feedbackSelected.complaintId}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.ratingPill,
                  feedbackRating === n ? styles.ratingPillActive : styles.ratingPillInactive
                ]}
                onPress={() => setFeedbackRating(n)}
              >
                <Text style={feedbackRating === n ? styles.ratingTextActive : styles.ratingTextInactive}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={feedbackComment}
            onChangeText={setFeedbackComment}
            placeholder="Write your feedback (optional)"
            multiline
          />
          <View style={styles.inlineActions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={async () => {
                try {
                  const res = await client.post(`/complaints/${feedbackSelected._id}/feedback`, {
                    rating: feedbackRating,
                    comment: feedbackComment
                  });
                  if (res.data?.success) {
                    Alert.alert(t.success || 'Success', 'Feedback submitted');
                    setFeedbackSelected(null);
                    const refreshed = await client.get('/complaints/my-complaints');
                    setItems(refreshed.data?.complaints || []);
                  } else {
                    Alert.alert(t.error || 'Error', res.data?.message || 'Failed to submit feedback');
                  }
                } catch (e) {
                  Alert.alert(t.error || 'Error', e?.response?.data?.message || 'Server error');
                }
              }}
            >
              <Text style={styles.btnText}>{t.submit}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => setFeedbackSelected(null)}>
              <Text style={styles.btnTextSecondary}>{t.cancel || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={styles.actions}>
        {/* Back button moved to header */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, elevation: 2, marginBottom: 10 },
  backButton: { marginRight: 16, padding: 4 },
  backButtonText: { fontSize: 16, color: '#667eea', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#2d3748' },
  listContent: { padding: 20, paddingBottom: 40 },
  loader: { marginTop: 50 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12, display: 'none' }, // Hidden as moved to header
  actions: { marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginVertical: 8, borderColor: '#e2e8f0', borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  cardCritical: { borderLeftColor: '#ef4444', borderLeftWidth: 4 },
  cardHigh: { borderLeftColor: '#f97316', borderLeftWidth: 4 },
  cardMedium: { borderLeftColor: '#eab308', borderLeftWidth: 4 },
  cardLow: { borderLeftColor: '#22c55e', borderLeftWidth: 4 },
  cardOther: { borderLeftColor: '#A0AEC0', borderLeftWidth: 4 },
  cardTitle: { fontWeight: '600', marginBottom: 6 },
  cardText: { color: '#444' },
  cardMeta: { color: '#666', marginTop: 6 }
  ,cardActions: { marginTop: 8 },
  subTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  evidenceBox: { backgroundColor: '#f7fafc', borderRadius: 12, padding: 12, borderColor: '#e2e8f0', borderWidth: 1 },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 8, padding: 12, marginVertical: 6 },
  inlineActions: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  btnPrimary: { backgroundColor: '#667eea' },
  btnSecondary: { backgroundColor: '#edf2f7' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextSecondary: { color: '#2d3748', fontWeight: '600' },
  mediaContainer: { marginTop: 12, marginBottom: 8 },
  mediaThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8, backgroundColor: '#eee' },
  evidenceSummary: { marginTop: 8, backgroundColor: '#edf2f7', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  evidenceText: { color: '#2d3748', fontWeight: '600' }
  ,ratingPill: { width: 44, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }
  ,ratingPillActive: { backgroundColor: '#667eea', borderColor: '#667eea' }
  ,ratingPillInactive: { backgroundColor: '#fff', borderColor: '#cbd5e0' }
  ,ratingTextActive: { color: '#fff', fontWeight: '700' }
  ,ratingTextInactive: { color: '#2d3748', fontWeight: '700' }
});
