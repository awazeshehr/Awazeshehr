import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import client from '../api/client';

import { translations } from '../constants/translations';

export default function OtpScreen({ email: initialEmail, onBack, lang }) {
  const t = translations[lang || 'english'];
  const [email, setEmail] = useState(initialEmail || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setLoading(true);
    try {
      const res = await client.post('/auth/verify-otp', { email, otp });
      if (res.data?.success) {
        Alert.alert('Verified', 'Email verified successfully');
        onBack();
      } else {
        Alert.alert('Verification failed', res.data?.message || 'Unknown error');
      }
    } catch (e) {
      Alert.alert('Verification error', e?.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const res = await client.post('/auth/resend-otp', { email });
      Alert.alert('OTP', res.data?.message || 'OTP resent');
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Email</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
      <View style={styles.actions}>
        <Button title={loading ? 'Verifying...' : 'Verify'} onPress={verify} />
      </View>
      <View style={styles.actions}>
        <Button title="Resend OTP" onPress={resend} />
      </View>
      <View style={styles.actions}>
        <Button title="Back" onPress={onBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 8, padding: 12, marginVertical: 8 },
  actions: { marginTop: 8 }
});
