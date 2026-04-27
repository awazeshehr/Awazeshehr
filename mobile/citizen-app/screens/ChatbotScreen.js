import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { translations } from '../constants/translations';
import client from '../api/client';

export default function ChatbotScreen({ onBack, lang = 'english' }) {
  const t = translations[lang];
  const [complaints, setComplaints] = useState([]);
  const [messages, setMessages] = useState([
    {
      _id: 1,
      text: t.chatbotWelcome,
      sender: 'bot',
      quickReplies: [
        t.chatbotOption1,
        t.chatbotOption2,
        t.chatbotOption3
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await client.get('/complaints/my-complaints');
      if (res.data && res.data.complaints) {
        setComplaints(res.data.complaints);
      }
    } catch (err) {
      console.log('Error fetching complaints for chatbot:', err);
    }
  };

  const handleSend = (text) => {
    const msgText = text || inputText;
    if (!msgText.trim()) return;

    const userMsg = { _id: Date.now(), text: msgText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Simulate bot response
    setTimeout(() => {
      let botResponseText = t.botDefaultResponse;
      const lowerMsg = msgText.toLowerCase();

      // Check if message contains a complaint ID
      const foundComplaint = complaints.find(c => lowerMsg.includes(c.complaintId.toLowerCase()));

      if (foundComplaint) {
        botResponseText = `${t.complaintId}: ${foundComplaint.complaintId}\n${t.status}: ${foundComplaint.status}\n${t.category}: ${foundComplaint.category}`;
      } else if (lowerMsg.includes(t.chatbotOption1.toLowerCase()) || lowerMsg.includes("submit") || lowerMsg.includes("شکایت")) {
        botResponseText = t.botSubmitResponse;
      } else if (lowerMsg.includes(t.chatbotOption2.toLowerCase()) || lowerMsg.includes("status") || lowerMsg.includes("حیثیت")) {
        botResponseText = t.botStatusResponse;
      } else if (lowerMsg.includes(t.chatbotOption3.toLowerCase()) || lowerMsg.includes("services") || lowerMsg.includes("خدمات")) {
        botResponseText = t.botServiceResponse;
      }

      const botMsg = { _id: Date.now() + 1, text: botResponseText, sender: 'bot' };
      setMessages(prev => [...prev, botMsg]);
    }, 1000);
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);
  
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

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a2a6c', '#b21f1f']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← {t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.chatWithAI}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: keyboardHeight + composerHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.sender === 'user' ? styles.msgRowRight : styles.msgRowLeft]}>
            {item.sender === 'user' ? (
              <LinearGradient
                colors={['#1a2a6c', '#b21f1f']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={[styles.bubble, styles.bubbleRight]}
              >
                <Text style={[styles.msgText, styles.textRight]}>{item.text}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.bubble, styles.bubbleLeft]}>
                <Text style={[styles.msgText, styles.textLeft]}>{item.text}</Text>
              </View>
            )}
            {item.sender === 'bot' && item.quickReplies && (
              <View style={styles.quickReplies}>
                {item.quickReplies.map((qr, idx) => (
                  <TouchableOpacity key={idx} style={styles.qrBtn} onPress={() => handleSend(qr)}>
                    <Text style={styles.qrText}>{qr}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'position' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
        style={[styles.composerWrapper, { bottom: keyboardHeight }]}
      >
        <View style={styles.composerBar} onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}>
          <TextInput
            style={[styles.composerInput, { color: '#111827' }]}
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
          <TouchableOpacity onPress={() => handleSend()}>
            <LinearGradient
              colors={['#1a2a6c', '#b21f1f']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.sendBtn}
            >
              <Text style={styles.sendText}>{t.send}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { padding: 8 },
  backText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  listContent: { padding: 16 },
  composerWrapper: { position: 'absolute', left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', zIndex: 10 },
  msgRow: { marginVertical: 4 },
  msgRowLeft: { alignItems: 'flex-start' },
  msgRowRight: { alignItems: 'flex-end' },
  bubble: { padding: 12, borderRadius: 16, maxWidth: '80%' },
  bubbleLeft: { backgroundColor: '#fff', borderTopLeftRadius: 4 },
  bubbleRight: { borderTopRightRadius: 4 },
  msgText: { fontSize: 15 },
  textLeft: { color: '#333' },
  textRight: { color: '#fff' },
  quickReplies: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  qrBtn: { backgroundColor: '#e2e8f0', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, marginRight: 8, marginBottom: 8 },
  qrText: { color: '#4a5568', fontSize: 13 },
  composerBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 8, backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  composerInput: { flex: 1, backgroundColor: 'transparent', borderRadius: 16, paddingHorizontal: 6, paddingVertical: 6, minHeight: 36, maxHeight: 120 },
  sendBtn: { justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  sendText: { color: '#fff', fontWeight: '600' }
});
