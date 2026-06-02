import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, TouchableOpacity, Image, KeyboardAvoidingView, ScrollView } from 'react-native';
import client, { setToken } from '../api/client';
import ParticleBackground from '../components/ParticleBackground';
import { translations } from '../constants/translations';
import colors from '../constants/colors';

export default function LoginScreen({ onRegister, onLoggedIn, onForgotPassword, lang, setLang }) {
  const t = translations[lang || 'english'];
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter identifier and password');
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/auth/login', { identifier, password });
      if (res.data?.success) {
        try {
          setToken(res.data.token);
          if (Platform.OS !== 'web') {
            try {
              const SecureStore = require('expo-secure-store');
              if (typeof SecureStore?.setItemAsync === 'function') {
                await SecureStore.setItemAsync('token', res.data.token);
              }
            } catch {}
          } else if (typeof window !== 'undefined' && window?.localStorage) {
            window.localStorage.setItem('token', res.data.token);
          }
        } catch {}
        onLoggedIn(res.data.user);
      } else {
        Alert.alert('Login failed', res.data?.message || 'Unknown error');
      }
    } catch (e) {
      Alert.alert('Login error', e?.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    setLang(lang === 'english' ? 'urdu' : 'english');
  };

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.langSwitchWrap}>
                <TouchableOpacity onPress={toggleLang} style={styles.langBtn}>
                    <Text style={styles.langBtnText}>{lang === 'english' ? 'اردو' : 'English'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.logoWrap}>
            <Image source={require('../assets/icon.png')} style={styles.logo} />
            </View>
            <Text style={styles.title}>{t.appTitle}</Text>
            <Text style={styles.subtitle}>{t.citizenPortal}</Text>
            
            <View style={styles.card}>
                <TextInput 
                    style={styles.input} 
                    placeholder={t.emailPlaceholder} 
                    value={identifier} 
                    onChangeText={setIdentifier} 
                    autoCapitalize="none" 
                />
                <View style={styles.inputWrap}>
                    <TextInput
                    style={styles.inputInner}
                    placeholder={t.passwordPlaceholder}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    />
                    <TouchableOpacity style={styles.eyeInside} onPress={() => setShowPassword(v => !v)}>
                    <Text style={styles.eyeInsideText}>{showPassword ? t.hide : t.show}</Text>
                    </TouchableOpacity>
                </View>
                
                <TouchableOpacity onPress={onForgotPassword} style={styles.forgotBtn}>
                    <Text style={styles.forgotText}>{t.forgotPassword}</Text>
                </TouchableOpacity>

                <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={login}>
                    <Text style={styles.btnText}>{loading ? t.signingIn : t.login}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onRegister}>
                    <Text style={styles.btnTextSecondary}>{t.register}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  langSwitchWrap: { position: 'absolute', top: 40, right: 0, zIndex: 10 },
  langBtn: { backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  langBtnText: { fontWeight: '700', color: colors.primary },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', color: colors.primary, marginBottom: 4 },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 90, height: 90, borderRadius: 20 },
  subtitle: { fontSize: 18, color: colors.textSecondary, textAlign: 'center', marginBottom: 32, letterSpacing: 1 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  input: { borderColor: colors.inputBorder, borderWidth: 1, borderRadius: 12, padding: 14, marginVertical: 8, backgroundColor: colors.light, fontSize: 16, color: colors.text },
  inputWrap: { position: 'relative', borderColor: colors.inputBorder, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginVertical: 8, backgroundColor: colors.light },
  inputInner: { paddingVertical: 14, paddingRight: 60, fontSize: 16, color: colors.text },
  eyeInside: { position: 'absolute', right: 12, top: '50%', transform: [{ translateY: -15 }], height: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.lightGray },
  eyeInsideText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: colors.primary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnSecondary: { backgroundColor: colors.lightGray, borderColor: colors.inputBorder, borderWidth: 1 },
  btnText: { color: colors.light, fontWeight: '700', fontSize: 16 },
  btnTextSecondary: { color: colors.textSecondary, fontWeight: '700', fontSize: 16 }
});
