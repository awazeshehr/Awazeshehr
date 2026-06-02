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
import FieldOfficerHomeScreen from './screens/FieldOfficerHomeScreen';
import FieldOfficerAssignedComplaintsScreen from './screens/FieldOfficerAssignedComplaintsScreen';
import FieldOfficerComplaintChatListScreen from './screens/FieldOfficerComplaintChatListScreen';
import FieldOfficerComplaintDetailsScreen from './screens/FieldOfficerComplaintDetailsScreen';
import FieldOfficerPerformanceScreen from './screens/FieldOfficerPerformanceScreen';
import FieldOfficerProfileScreen from './screens/FieldOfficerProfileScreen';
import FieldOfficerSettingsScreen from './screens/FieldOfficerSettingsScreen';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('english'); // 'english' or 'urdu'

  useEffect(() => {
    (async () => {
      let token = null;
      let userRaw = null;
      try {
        if (Platform.OS !== 'web') {
          try {
            const SecureStore = require('expo-secure-store');
            if (typeof SecureStore?.getItemAsync === 'function') {
              token = await SecureStore.getItemAsync('token');
              userRaw = await SecureStore.getItemAsync('user');
            }
          } catch {}
        } else if (typeof window !== 'undefined' && window?.localStorage) {
          token = window.localStorage.getItem('token');
          userRaw = window.localStorage.getItem('user');
        }
      } catch {}
      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw);
          if (parsed && typeof parsed === 'object') setUser(parsed);
        } catch {}
      }
      if (token) {
        const role = String((userRaw && (() => { try { return JSON.parse(userRaw)?.role; } catch { return ''; } })()) || '').trim();
        if (role === 'field-officer') setScreen({ name: 'fo-dashboard' });
        else setScreen('home');
      }
    })();
  }, []);

  const persistUser = async (nextUser) => {
    try {
      const raw = JSON.stringify(nextUser || null);
      if (Platform.OS !== 'web') {
        try {
          const SecureStore = require('expo-secure-store');
          if (typeof SecureStore?.setItemAsync === 'function') {
            await SecureStore.setItemAsync('user', raw);
          }
        } catch {}
      } else if (typeof window !== 'undefined' && window?.localStorage) {
        window.localStorage.setItem('user', raw);
      }
    } catch {}
  };

  const onLoggedIn = async (nextUser) => {
    setUser(nextUser || null);
    await persistUser(nextUser || null);
    const role = String(nextUser?.role || '').trim();
    if (role === 'field-officer') setScreen({ name: 'fo-dashboard' });
    else setScreen('home');
  };

  const logout = async () => {
    try {
      clearToken();
      if (Platform.OS !== 'web') {
        try {
          const SecureStore = require('expo-secure-store');
          if (typeof SecureStore?.deleteItemAsync === 'function') {
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('user');
          }
        } catch {}
      } else if (typeof window !== 'undefined' && window?.localStorage) {
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('user');
      }
    } catch {}
    setUser(null);
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

      {typeof screen === 'object' && screen?.name === 'fo-dashboard' && (
        <FieldOfficerHomeScreen
          lang={lang}
          setLang={setLang}
          user={user}
          onAssignedComplaints={() => setScreen({ name: 'fo-assigned' })}
          onComplaintChat={() => setScreen({ name: 'fo-chat-list' })}
          onNotifications={() => setScreen({ name: 'fo-notifications' })}
          onPerformance={() => setScreen({ name: 'fo-performance' })}
          onProfile={() => setScreen({ name: 'fo-profile' })}
          onSettings={() => setScreen({ name: 'fo-settings' })}
          onOpenComplaint={(complaintId) => setScreen({ name: 'fo-details', complaintId })}
          onOpenChat={(complaintId) => setScreen({ name: 'fo-chat', complaintId })}
          onLogout={logout}
        />
      )}

      {typeof screen === 'object' && screen?.name === 'fo-assigned' && (
        <FieldOfficerAssignedComplaintsScreen
          lang={lang}
          user={user}
          onBack={() => setScreen({ name: 'fo-dashboard' })}
          onOpenComplaint={(complaintId) => setScreen({ name: 'fo-details', complaintId })}
          onOpenChat={(complaintId) => setScreen({ name: 'fo-chat', complaintId })}
        />
      )}

      {typeof screen === 'object' && screen?.name === 'fo-chat-list' && (
        <FieldOfficerComplaintChatListScreen
          lang={lang}
          onBack={() => setScreen({ name: 'fo-dashboard' })}
          onOpenChat={(complaintId) => setScreen({ name: 'fo-chat', complaintId })}
          onOpenComplaint={(complaintId) => setScreen({ name: 'fo-details', complaintId })}
        />
      )}

      {typeof screen === 'object' && screen?.name === 'fo-notifications' && (
        <NotificationsScreen onBack={() => setScreen({ name: 'fo-dashboard' })} lang={lang} />
      )}

      {typeof screen === 'object' && screen?.name === 'fo-details' && (
        <FieldOfficerComplaintDetailsScreen
          lang={lang}
          user={user}
          complaintId={screen.complaintId}
          onBack={() => setScreen({ name: 'fo-assigned' })}
          onOpenChat={() => setScreen({ name: 'fo-chat', complaintId: screen.complaintId })}
        />
      )}

      {typeof screen === 'object' && screen?.name === 'fo-chat' && (
        <OfficerChatScreen
          complaintId={screen.complaintId}
          onBack={() => setScreen({ name: 'fo-details', complaintId: screen.complaintId })}
          lang={lang}
          selfRole="field-officer"
        />
      )}

      {typeof screen === 'object' && screen?.name === 'fo-performance' && (
        <FieldOfficerPerformanceScreen
          lang={lang}
          user={user}
          onBack={() => setScreen({ name: 'fo-dashboard' })}
        />
      )}

      {typeof screen === 'object' && screen?.name === 'fo-profile' && (
        <FieldOfficerProfileScreen
          lang={lang}
          user={user}
          onBack={() => setScreen({ name: 'fo-dashboard' })}
        />
      )}

      {typeof screen === 'object' && screen?.name === 'fo-settings' && (
        <FieldOfficerSettingsScreen
          lang={lang}
          setLang={setLang}
          user={user}
          onBack={() => setScreen({ name: 'fo-dashboard' })}
          onLogout={logout}
        />
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
