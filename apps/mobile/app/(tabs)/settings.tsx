import { View, Text, StyleSheet, Switch, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth';
import { useVisitStore } from '../../src/stores/visits';
import { useState } from 'react';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { simulateVisit } = useVisitStore();
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSimulateVisit = () => {
    Alert.alert(
      'Simulate Visit',
      'This will create a test cinema visit for development purposes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate',
          onPress: () => simulateVisit(),
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || 'Not logged in'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="location" size={20} color="#e94560" />
            <Text style={styles.settingLabel}>Cinema Detection</Text>
          </View>
          <Switch
            value={trackingEnabled}
            onValueChange={setTrackingEnabled}
            trackColor={{ false: '#0f3460', true: '#e94560' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={20} color="#e94560" />
            <Text style={styles.settingLabel}>Review Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#0f3460', true: '#e94560' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {__DEV__ && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <Pressable style={styles.devButton} onPress={handleSimulateVisit}>
            <Ionicons name="bug" size={20} color="#fbbf24" />
            <Text style={styles.devButtonText}>Simulate Cinema Visit</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a0a0b0',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 12,
    color: '#a0a0b0',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#ffffff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  devButtonText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
