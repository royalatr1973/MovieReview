import { useState } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/services/api-client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { token: tokenFromLink } = useLocalSearchParams<{ token?: string }>();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(tokenFromLink ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [mode, setMode] = useState<'request' | 'reset'>(tokenFromLink ? 'reset' : 'request');
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await api.post<{ message: string }>('/auth/forgot-password', { email: email.trim() });
      Alert.alert(
        'Check your email',
        'If an account exists for that address, a reset link has been sent. It expires in 1 hour.',
      );
      setMode('reset');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!token.trim() || !newPassword.trim()) {
      Alert.alert('Error', 'Paste the reset token from your email and pick a new password');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post<{ message: string }>('/auth/reset-password', {
        token: token.trim(),
        password: newPassword,
      });
      Alert.alert('Password updated', 'You can now log in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/(onboarding)/login') },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Invalid or expired token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>
          {mode === 'request' ? 'Reset password' : 'Set new password'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'request'
            ? "Enter your email and we'll send a reset link."
            : 'Paste the token from your email and choose a new password.'}
        </Text>

        {mode === 'request' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRequest}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setMode('reset')} style={styles.switchBtn}>
              <Text style={styles.switchText}>Already have a token? Enter it here</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Reset token"
              placeholderTextColor="#666"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#666"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Updating...' : 'Update password'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setMode('request')} style={styles.switchBtn}>
              <Text style={styles.switchText}>Need a new token?</Text>
            </Pressable>
          </>
        )}

        <Pressable onPress={() => router.back()} style={styles.switchBtn}>
          <Text style={styles.switchText}>Back to log in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#a0a0b0', marginBottom: 24 },
  input: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#0f3460',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#e94560',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  switchBtn: { marginTop: 16, alignItems: 'center' },
  switchText: { color: '#a0a0b0', fontSize: 14 },
});
