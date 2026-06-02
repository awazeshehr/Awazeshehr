import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Keyboard, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { translations } from '../constants/translations';
import client from '../api/client';

export default function ChatbotScreen({ onBack, lang = 'english' }) {
  const t = translations[lang];
  const [complaints, setComplaints] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      _id: 1,
      text: lang === 'urdu' ? "اسلام و علیکم! میں آپ کا آوازِ شہر AI اسسٹنٹ ہوں۔ میں اسلام آباد شہر کی خدمات میں آپ کی کیسے مدد کر سکتا ہوں؟" : "Assalam-o-Alaikum! I am your Awaz-e-Shehr AI Assistant. How can I help you today with Islamabad city services?",
      sender: 'bot',
      quickReplies: lang === 'urdu' ? [
        "مسئلہ رپورٹ کریں",
        "سٹی الرٹس",
        "سٹی ہیلپ لائنز"
      ] : [
        "Report an issue",
        "City Alerts",
        "City Helplines"
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);

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

  const localFallback = (msgText) => {
    let botResponseText = lang === 'urdu'
      ? "معذرت، مجھے سمجھ نہیں آئی۔ آپ اپنی شکایت کی صورتحال یا نیا مسئلہ رپورٹ کرنے کے بارے میں پوچھ سکتے ہیں۔"
      : "I'm sorry, I didn't quite get that. You can ask about your complaint status or how to report a new issue.";

    const lowerMsg = msgText.toLowerCase();
    const foundComplaint = complaints.find(c => lowerMsg.includes(String(c?.complaintId || '').toLowerCase()));

    if (foundComplaint) {
      botResponseText = lang === 'urdu'
        ? `مجھے آپ کی شکایت مل گئی ہے!\n\nID: #${foundComplaint.complaintId}\nحیثیت: ${foundComplaint.status}\nکیٹیگری: ${foundComplaint.category}\n\nکیا آپ متعلقہ افسر سے بات کرنا چاہیں گے؟`
        : `I found your complaint!\n\nID: #${foundComplaint.complaintId}\nStatus: ${String(foundComplaint.status || '').toUpperCase()}\nCategory: ${foundComplaint.category}\n\nWould you like to chat with the assigned officer?`;
    } else if (lowerMsg.includes("report") || lowerMsg.includes("issue") || lowerMsg.includes("شکایت") || lowerMsg.includes("مسئلہ")) {
      botResponseText = lang === 'urdu'
        ? "مسئلہ رپورٹ کرنے کے لیے، ہوم ڈیش بورڈ پر 'شکایت جمع کروائیں' کے بٹن پر کلک کریں۔ آپ تصاویر اپ لوڈ کر سکتے ہیں اور اپنی لوکیشن ٹیگ کر سکتے ہیں۔"
        : "To report an issue, simply click the 'Submit Complaint' button on the Home dashboard. You can upload photos and tag your location directly.";
    } else if (lowerMsg.includes("status") || lowerMsg.includes("حیثیت") || lowerMsg.includes("صورتحال")) {
      botResponseText = lang === 'urdu'
        ? "آپ ہوم اسکرین پر 'ٹریک اسٹیٹس' سیکشن میں یا مینو سے 'میری شکایات' پر جا کر اپنی فعال شکایات کو ٹریک کر سکتے ہیں۔"
        : "You can track your active complaints in the 'Track Status' section on the Home screen or by going to 'My Complaints' from the menu.";
    } else if (lowerMsg.includes("alert") || lowerMsg.includes("news") || lowerMsg.includes("الرٹ") || lowerMsg.includes("خبر")) {
      botResponseText = lang === 'urdu'
        ? "موجودہ الرٹس:\n1. اتوار کو G-10 میں پانی کی سپلائی کی دیکھ بھال۔\n2. اگلے ہفتے سے F-6 میں سڑک کی مرمت کا کام شروع ہو رہا ہے۔"
        : "Current Alerts: \n1. Water supply maintenance in G-10 on Sunday.\n2. Road repair work starting in F-6 next week.";
    } else if (lowerMsg.includes("helpline") || lowerMsg.includes("emergency") || lowerMsg.includes("ہیلپ لائن") || lowerMsg.includes("ایمرجنسی")) {
      botResponseText = lang === 'urdu'
        ? "اہم ہیلپ لائنز:\n- پولیس: 15\n- ایمبولینس: 1122\n- CDA ہیلپ لائن: 1334\n- آگ بجھانے والا عملہ: 16"
        : "Important Helplines:\n- Police: 15\n- Ambulance: 1122\n- CDA Helpline: 1334\n- Fire Brigade: 16";
    }

    return botResponseText;
  };

  const handleSend = async (text) => {
    const msgText = String(text || inputText || '').trim();
    if (!msgText) return;

    const userMsg = { _id: Date.now(), text: msgText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const recentHistory = [...messages, userMsg]
        .filter(m => m?.sender === 'user' || m?.sender === 'bot')
        .slice(-12)
        .map(m => ({ sender: m.sender, text: String(m.text || '') }));

      const complaintContext = (complaints || []).slice(0, 6).map(c => {
        return `#${c?.complaintId} | ${c?.status} | ${c?.category}`;
      }).join('\n');

      const res = await client.post('/chat/assistant', {
        message: msgText,
        lang,
        history: recentHistory,
        context: complaintContext ? `User complaints (latest):\n${complaintContext}` : ''
      });

      const reply = String(res.data?.reply || '').trim();
      const botMsg = { _id: Date.now() + 1, text: reply || localFallback(msgText), sender: 'bot' };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.message;
      const hint =
        status === 401
          ? (lang === 'urdu' ? 'آپ کا سیشن ختم ہو گیا ہے، براہِ کرم دوبارہ لاگ اِن کریں۔' : 'Your session expired. Please log in again.')
          : status === 500 && String(serverMsg || '').toLowerCase().includes('key')
            ? (lang === 'urdu' ? 'AI key server پر set نہیں ہے۔ Render/Hosting میں XAI_API_KEY (یا fallback کے لیے GEMINI_API_KEY) add کر کے redeploy کریں۔' : 'AI key is not set on server. Add XAI_API_KEY (or GEMINI_API_KEY as fallback) on hosting and redeploy.')
            : '';
      const botMsg = { _id: Date.now() + 1, text: hint || localFallback(msgText), sender: 'bot' };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <View style={styles.onlineStatus}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Feather name="more-vertical" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.sender === 'user' ? styles.msgRowRight : styles.msgRowLeft]}>
            <View style={[styles.bubble, item.sender === 'user' ? styles.bubbleRight : styles.bubbleLeft]}>
              <Text style={[styles.msgText, item.sender === 'user' ? styles.textRight : styles.textLeft]}>{item.text}</Text>
            </View>
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
        ListFooterComponent={isTyping ? (
          <View style={[styles.msgRow, styles.msgRowLeft]}>
            <View style={[styles.bubble, styles.bubbleLeft, { paddingVertical: 8 }]}>
              <Text style={[styles.msgText, { fontStyle: 'italic', color: '#718096' }]}>AI is typing...</Text>
            </View>
          </View>
        ) : null}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.composerBar}>
          <TouchableOpacity style={styles.attachBtn}>
            <Feather name="plus" size={24} color="#0056D2" />
          </TouchableOpacity>
          <TextInput
            style={styles.composerInput}
            placeholder="Type a message..."
            placeholderTextColor="#a0aec0"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity onPress={() => handleSend()} style={styles.sendBtn}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  onlineStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#48bb78', marginRight: 5 },
  onlineText: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  backBtn: { padding: 5 },
  headerIcon: { padding: 5 },
  
  listContent: { padding: 20, paddingBottom: 30 },
  msgRow: { marginVertical: 10, maxWidth: '85%' },
  msgRowLeft: { alignSelf: 'flex-start' },
  msgRowRight: { alignSelf: 'flex-end' },
  
  bubble: { padding: 15, borderRadius: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  bubbleLeft: { backgroundColor: '#fff', borderTopLeftRadius: 5 },
  bubbleRight: { backgroundColor: '#0056D2', borderTopRightRadius: 5 },
  
  msgText: { fontSize: 15, lineHeight: 22 },
  textLeft: { color: '#2d3748' },
  textRight: { color: '#fff' },
  
  quickReplies: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  qrBtn: { backgroundColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: '#cbd5e0' },
  qrText: { color: '#2d3748', fontSize: 13, fontWeight: '600' },
  
  composerBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingVertical: 12, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#f0f4f8' 
  },
  attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  composerInput: { 
    flex: 1, 
    backgroundColor: '#f7fafc', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    marginHorizontal: 10, 
    fontSize: 15, 
    color: '#2d3748',
    maxHeight: 100
  },
  sendBtn: { 
    width: 44, 
    height: 44, 
    backgroundColor: '#0056D2', 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 3
  }
});
