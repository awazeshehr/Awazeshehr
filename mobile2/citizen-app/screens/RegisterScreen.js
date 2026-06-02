import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';
import client from '../api/client';
import { translations } from '../constants/translations';
import colors from '../constants/colors';

export default function RegisterScreen({ onBack, onOtp, lang = 'english' }) {
  const t = translations[lang] || translations.english;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const register = async () => {
    if (!fullName || !email || !phone || !cnic || !password || !confirmPassword) {
      Alert.alert(t.validation, t.fillAllFields);
      return;
    }
    if (!/^[A-Za-z ]+$/.test(fullName.trim())) {
      Alert.alert(t.validation, t.nameLettersOnly);
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!emailOk) {
      Alert.alert(t.validation, t.invalidEmail);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t.validation, t.passwordMismatch);
      return;
    }
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert(t.validation, "fulfill requirements of password");
      return;
    }
    const phoneOk = /^03\d{9}$/.test(phone.trim()) && /^\d{11}$/.test(phone.trim());
    const cnicOk = /^\d{13}$/.test(cnic.trim());
    if (!phoneOk) {
      Alert.alert(t.validation, t.invalidPhone);
      return;
    }
    if (!cnicOk) {
      Alert.alert(t.validation, t.invalidCnic);
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/auth/register', { fullName, email, phone, cnic, password, confirmPassword });
      if (res.data?.success) {
        Alert.alert(t.registered, t.otpSent);
        onOtp(email);
      } else {
        Alert.alert(t.registrationFailed, res.data?.message || t.error);
      }
    } catch (e) {
      Alert.alert(t.registrationError, e?.response?.data?.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>{t.citizenRegistration}</Text>
      <TextInput style={styles.input} placeholder={t.fullName} value={fullName} onChangeText={(t) => setFullName(t.replace(/[^A-Za-z ]+/g, ''))} autoCapitalize="words" />
      <TextInput style={styles.input} placeholder={t.emailPlaceholder} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder={t.phonePlaceholder} value={phone} onChangeText={(t) => setPhone(t.replace(/\D+/g, '').slice(0, 11))} keyboardType="number-pad" maxLength={11} />
      <TextInput style={styles.input} placeholder={t.cnicPlaceholder} value={cnic} onChangeText={(t) => setCnic(t.replace(/\D+/g, '').slice(0, 13))} keyboardType="number-pad" maxLength={13} />
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
      <View style={[styles.inputWrap, (confirmPassword.length > 0 && password !== confirmPassword) && styles.inputWrapError]}>
        <TextInput
          style={styles.inputInner}
          placeholder={t.confirmPassword}
          secureTextEntry={!showConfirm}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity style={styles.eyeInside} onPress={() => setShowConfirm(v => !v)}>
          <Text style={styles.eyeInsideText}>{showConfirm ? t.hide : t.show}</Text>
        </TouchableOpacity>
      </View>
      {(confirmPassword.length > 0 && password !== confirmPassword) && (
        <Text style={styles.errorText}>{t.passwordMismatch}</Text>
      )}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary, (loading) && styles.btnDisabled]} onPress={register} disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword)}>
          <Text style={styles.btnText}>{loading ? t.registering : t.register}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onBack}>
          <Text style={styles.btnTextSecondary}>{t.back}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: colors.background, flexGrow: 1, justifyContent: 'center' },
  logo: { width: 84, height: 84, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12, textAlign: 'center', color: colors.primary },
  input: { borderColor: colors.inputBorder, borderWidth: 1, borderRadius: 8, padding: 12, marginVertical: 8, backgroundColor: colors.light, color: colors.text },
  inputWrap: { position: 'relative', borderColor: colors.inputBorder, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginVertical: 8, backgroundColor: colors.light },
  inputInner: { paddingVertical: 12, paddingRight: 56, color: colors.text },
  inputWrapError: { borderColor: colors.danger },
  eyeInside: { position: 'absolute', right: 12, top: '50%', transform: [{ translateY: -14 }], height: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.lightGray },
  eyeInsideText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  actions: { marginTop: 8 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.lightGray, borderWidth: 1, borderColor: colors.inputBorder },
  btnDisabled: { opacity: 0.8 },
  btnText: { color: colors.light, fontWeight: '600' },
  btnTextSecondary: { color: colors.textSecondary, fontWeight: '600' },
  errorText: { color: colors.danger, fontWeight: '600', marginTop: 4, textAlign: 'left' }
});
