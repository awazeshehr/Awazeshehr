import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';
import { clearToken } from './api/client';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import OtpScreen from './screens/OtpScreen';
import HomeScreen from './screens/HomeScreen';
import SubmitComplaintScreen from './screens/SubmitComplaintScreen';
import MyComplaintsScreen from './screens/MyComplaintsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import OfficerChatScreen from './screens/OfficerChatScreen';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [lang, setLang] = useState('english'); // 'english' or 'urdu'

  useEffect(() => {
    (async () => {
      let token = null;
      try {
        if (Platform.OS !== 'web') {
          try {
            const SecureStore = require('expo-secure-store');
            if (typeof SecureStore?.getItemAsync === 'function') {
              token = await SecureStore.getItemAsync('token');
            }
          } catch {}
        } else if (typeof window !== 'undefined' && window?.localStorage) {
          token = window.localStorage.getItem('token');
        }
      } catch {}
      if (token) setScreen('home');
    })();
  }, []);

  const onLoggedIn = () => {
    setScreen('home');
  };

  const logout = async () => {
    try {
      clearToken();
      if (Platform.OS !== 'web') {
        try {
          const SecureStore = require('expo-secure-store');
          if (typeof SecureStore?.deleteItemAsync === 'function') {
            await SecureStore.deleteItemAsync('token');
          }
        } catch {}
      } else if (typeof window !== 'undefined' && window?.localStorage) {
        window.localStorage.removeItem('token');
      }
    } catch {}
    setScreen('login');
  };

  return (
    <SafeAreaView style={styles.container}>
      {screen === 'login' && (
        <LoginScreen 
            onRegister={() => setScreen('register')} 
            onLoggedIn={onLoggedIn} 
            onForgotPassword={() => setScreen('forgot-password')}
            lang={lang}
            setLang={setLang}
        />
      )}
      {screen === 'forgot-password' && (
        <ForgotPasswordScreen onBack={() => setScreen('login')} lang={lang} />
      )}
      {screen === 'register' && (
        <RegisterScreen onBack={() => setScreen('login')} onOtp={(email) => setScreen({ name: 'otp', email })} lang={lang} />
      )}
      {typeof screen === 'object' && screen?.name === 'otp' && (
        <OtpScreen email={screen.email} onBack={() => setScreen('login')} lang={lang} />
      )}
      {screen === 'home' && (
        <HomeScreen 
            onSubmit={() => setScreen('submit')} 
            onMyComplaints={() => setScreen('complaints')} 
            onNotifications={() => setScreen('notifications')} 
            onLogout={logout} 
            onChatbot={() => setScreen('chatbot')}
            onChatWithOfficer={(complaintId) => setScreen({ name: 'officer-chat', complaintId })}
            lang={lang}
            setLang={setLang}
        />
      )}
      {screen === 'chatbot' && (
          <ChatbotScreen onBack={() => setScreen('home')} lang={lang} />
      )}
      {typeof screen === 'object' && screen?.name === 'officer-chat' && (
          <OfficerChatScreen 
            complaintId={screen.complaintId} 
            onBack={() => setScreen('home')} 
            lang={lang}
          />
      )}
      {screen === 'submit' && (
        <SubmitComplaintScreen onBack={() => setScreen('home')} lang={lang} />
      )}
      {screen === 'complaints' && (
        <MyComplaintsScreen 
            onBack={() => setScreen('home')} 
            lang={lang}
            onChatWithOfficer={(complaintId) => setScreen({ name: 'officer-chat', complaintId })}
        />
      )}
      {screen === 'notifications' && (
        <NotificationsScreen onBack={() => setScreen('home')} lang={lang} />
      )}
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" translucent={false} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0
  }
});
