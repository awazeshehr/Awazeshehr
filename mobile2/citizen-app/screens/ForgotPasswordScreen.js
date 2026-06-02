import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import client from '../api/client';
import ParticleBackground from '../components/ParticleBackground';
import { translations } from '../constants/translations';

export default function ForgotPasswordScreen({ onBack, lang }) {
  const t = translations[lang || 'english'];
  const [stage, setStage] = useState('email'); // email, otp, password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(t.error, t.invalidEmail);
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setStage('otp');
        Alert.alert(t.success, t.otpSent);
      } else {
        Alert.alert(t.error, res.data.message || t.error);
      }
    } catch (e) {
      Alert.alert(t.error, e.response?.data?.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert(t.error, 'Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/auth/verify-reset-otp', { email, otp });
      if (res.data.success) {
        setStage('password');
      } else {
        Alert.alert(t.error, res.data.message || t.error);
      }
    } catch (e) {
      Alert.alert(t.error, e.response?.data?.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      Alert.alert(t.error, "fulfill requirements of password");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t.error, t.passwordsDoNotMatch);
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/auth/reset-password', {
        email,
        otp,
        newPassword,
        confirmPassword
      });
      if (res.data.success) {
        Alert.alert(t.success, t.passwordResetSuccess, [
          { text: 'OK', onPress: onBack }
        ]);
      } else {
        Alert.alert(t.error, res.data.message || t.error);
      }
    } catch (e) {
      Alert.alert(t.error, e.response?.data?.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  const renderStage = () => {
    switch (stage) {
      case 'email':
        return (
          <>
            <Text style={styles.title}>{t.forgotPassword}</Text>
            <Text style={styles.subtitle}>{t.enterEmailDesc}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.emailPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleEmailSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t.sendResetLink}</Text>}
            </TouchableOpacity>
          </>
        );
      case 'otp':
        return (
          <>
            <Text style={styles.title}>{t.enterOtp}</Text>
            <Text style={styles.subtitle}>{t.otpDescription} {email}</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="000000"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleOtpVerify} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t.verify}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStage('email')} style={{ marginTop: 16 }}>
              <Text style={styles.linkText}>{t.changeEmail}</Text>
            </TouchableOpacity>
          </>
        );
      case 'password':
        return (
          <>
            <Text style={styles.title}>{t.setNewPassword}</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.inputInner}
                placeholder={t.passwordPlaceholder}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeInside} onPress={() => setShowPassword(v => !v)}>
                <Text style={styles.eyeInsideText}>{showPassword ? t.hide : t.show}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.inputInner}
                placeholder={t.confirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity style={styles.eyeInside} onPress={() => setShowConfirm(v => !v)}>
                <Text style={styles.eyeInsideText}>{showConfirm ? t.hide : t.show}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={handlePasswordReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t.resetPassword}</Text>}
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ParticleBackground />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
              <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>← {t.back}</Text>
              </TouchableOpacity>
          </View>
          
          <View style={styles.logoWrap}>
            <Image source={require('../assets/icon.png')} style={styles.logo} />
          </View>

          {renderStage()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: 24, backgroundColor: 'rgba(255,255,255,0.9)', margin: 20, borderRadius: 16 },
  header: { marginBottom: 20 },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 16, color: '#667eea', fontWeight: '600' },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 64, height: 64, borderRadius: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: '#2d3748' },
  subtitle: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 24 },
  input: { borderColor: '#cbd5e0', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: '#fff' },
  otpInput: { letterSpacing: 8, textAlign: 'center', fontSize: 24, fontWeight: '700' },
  btnPrimary: { backgroundColor: '#667eea', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  linkText: { color: '#667eea', textAlign: 'center', fontWeight: '600' },
  inputWrap: { position: 'relative', borderColor: '#cbd5e0', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 16, backgroundColor: '#fff' },
  inputInner: { paddingVertical: 12, paddingRight: 56, color: '#2d3748' },
  eyeInside: { position: 'absolute', right: 12, top: '50%', transform: [{ translateY: -14 }], height: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#e2e8f0' },
  eyeInsideText: { fontSize: 12, fontWeight: '700', color: '#718096' }
});
