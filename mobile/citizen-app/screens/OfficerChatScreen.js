import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Keyboard } from 'react-native';
import { io } from 'socket.io-client';
import client, { API_URL } from '../api/client';
import { translations } from '../constants/translations';

const CITIZEN_TEMPLATES = [
  { key: 'still_not_resolved', label: 'Issue still not resolved.' },
  { key: 'additional_info', label: 'Additional information provided.' },
  { key: 'check_area', label: 'Please check this area.' },
  { key: 'thank_you', label: 'Thank you.' }
];

export default function OfficerChatScreen({ complaintId, onBack, lang = 'english' }) {
  const t = translations[lang];
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  const socketRef = useRef(null);
  const [user, setUser] = useState(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);
  const [templatesHeight, setTemplatesHeight] = useState(0);

  useEffect(() => {
    // Get user from local storage logic via client or context? 
    // For now we assume we are logged in.
    // Fetch chat history
    fetchMessages();

    // Connect socket
    // We need the token. 
    // Assuming API_URL is correct.
    const setupSocket = async () => {
        let token = null;
        if (Platform.OS !== 'web') {
             try {
                 const SecureStore = require('expo-secure-store');
                 token = await SecureStore.getItemAsync('token');
             } catch {}
        } else {
             token = localStorage.getItem('token');
        }

        if (token) {
            // Need to strip /api from API_URL if it's there
            const baseUrl = API_URL.replace('/api', '');
            const socket = io(baseUrl, {
                auth: { token: `Bearer ${token}` }
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                // console.log('Connected to socket');
                socket.emit('joinComplaint', complaintId);
            });

            socket.on('newMessage', (msg) => {
                if (msg.complaintId === complaintId) {
                    setMessages(prev => [...prev, msg]);
                }
            });
        }
    };
    setupSocket();

    return () => {
        if (socketRef.current) socketRef.current.disconnect();
    };
  }, [complaintId]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      const h = e?.endCoordinates?.height || 0;
      setKeyboardHeight(h);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const fetchMessages = async () => {
    try {
      const res = await client.get(`/chat/${complaintId}`);
      if (res.data?.success) {
        setMessages(res.data.messages || []);
      }
    } catch (e) {
      // console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const notes = inputText.trim();
    if (!selectedTemplateKey && !notes) return;

    if (socketRef.current && socketRef.current.connected) {
        const payload = {
            complaintId,
            templateKey: selectedTemplateKey || 'custom_message',
            notes
        };
        socketRef.current.emit('sendMessage', payload);
    } else {
        try {
          await client.post('/chat/send', {
            complaintId,
            templateKey: selectedTemplateKey || 'custom_message',
            notes
          });
        } catch {}
    }
    setInputText('');
    setSelectedTemplateKey(null);
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← {t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.chatWithOfficer}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : (
        <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item._id || index.toString()}
            contentContainerStyle={[styles.listContent, { paddingBottom: keyboardHeight + composerHeight + templatesHeight + 32 }]}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
                const isMe = item.senderRole === 'citizen';
                return (
                    <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
                        <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                            <Text style={[styles.senderName, isMe ? styles.textRight : styles.textLeft]}>
                                {isMe ? t.me : t.fieldOfficer}
                            </Text>
                            <Text style={[styles.msgText, isMe ? styles.textRight : styles.textLeft]}>
                                {item.text}
                            </Text>
                        </View>
                    </View>
                );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>{t.noMessages}</Text>}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'position' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
        style={[styles.composerWrapper, { bottom: keyboardHeight }]}
      >
        <View style={styles.templateBar} onLayout={(e) => setTemplatesHeight(e.nativeEvent.layout.height)}>
          {CITIZEN_TEMPLATES.map(tpl => {
            const selected = selectedTemplateKey === tpl.key;
            return (
              <TouchableOpacity
                key={tpl.key}
                style={[styles.templateBtn, selected ? styles.templateBtnSelected : styles.templateBtnUnselected]}
                onPress={() => setSelectedTemplateKey(selected ? null : tpl.key)}
              >
                <Text style={[styles.templateText, selected ? styles.templateTextSelected : styles.templateTextUnselected]}>
                  {tpl.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.composerBar} onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}>
          <TextInput
            style={styles.composerInput}
            placeholder={t.typeMessage}
            placeholderTextColor="#9aa3af"
            value={inputText}
            onChangeText={setInputText}
            multiline
            numberOfLines={3}
            scrollEnabled
            textAlignVertical="top"
            autoCorrect
            autoCapitalize="sentences"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!selectedTemplateKey && !inputText.trim()}>
            <Text style={styles.sendText}>{t.send}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 8 },
  backText: { fontSize: 16, color: '#667eea', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  listContent: { padding: 16 },
  composerWrapper: { position: 'absolute', left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', zIndex: 10 },
  msgRow: { marginVertical: 4 },
  msgRowLeft: { alignItems: 'flex-start' },
  msgRowRight: { alignItems: 'flex-end' },
  bubble: { padding: 12, borderRadius: 16, maxWidth: '80%' },
  bubbleLeft: { backgroundColor: '#fff', borderTopLeftRadius: 4 },
  bubbleRight: { backgroundColor: '#667eea', borderTopRightRadius: 4 },
  senderName: { fontSize: 10, marginBottom: 2, opacity: 0.7 },
  msgText: { fontSize: 15 },
  textLeft: { color: '#333' },
  textRight: { color: '#fff' },
  templateBar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  templateBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8, marginTop: 8 },
  templateBtnSelected: { backgroundColor: '#667eea' },
  templateBtnUnselected: { backgroundColor: '#edf2f7' },
  templateText: { fontSize: 12, fontWeight: '600' },
  templateTextSelected: { color: '#fff' },
  templateTextUnselected: { color: '#2d3748' },
  composerBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 8, backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  composerInput: { flex: 1, backgroundColor: 'transparent', color: '#111827', borderRadius: 16, paddingHorizontal: 6, paddingVertical: 6, minHeight: 36, maxHeight: 120 },
  sendBtn: { justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#667eea', borderRadius: 20 },
  sendText: { color: '#fff', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 }
});
