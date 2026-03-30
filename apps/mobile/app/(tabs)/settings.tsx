import { View, Text, StyleSheet, Switch, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuthStore } from '../../src/stores/auth';
import { useVisitStore } from '../../src/stores/visits';
import { useState } from 'react';
import { registerGeofences } from '../../src/services/geofence';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { simulateVisitAtCurrentLocation } = useVisitStore();
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [registering, setRegistering] = useState(false);

  const handleRegisterCurrentLocation = async () => {
    setRegistering(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to register your current location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Register as a geofence
      await registerGeofences([
        {
          id: 'my-test-cinema',
          name: 'My Test Cinema',
          latitude,
          longitude,
          radius: 100,
        },
      ]);

      Alert.alert(
        'Cinema Registered!',
        `Your current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) is now registered as "My Test Cinema" with a 100m geofence.\n\nWhen you leave this area and come back, the app will detect it as a cinema visit.`,
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to get location');
    } finally {
      setRegistering(false);
    }
  };

  const handleSimulateVisit = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Fallback to simulated location
        simulateVisitAtCurrentLocation(null);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      simulateVisitAtCurrentLocation(location.coords);

      Alert.alert(
        'Visit Simulated!',
        `A 2-hour cinema visit at your current location has been created. Check the Home tab.`,
      );
    } catch {
      simulateVisitAtCurrentLocation(null);
      Alert.alert('Visit Simulated!', 'A test cinema visit has been created. Check the Home tab.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testing</Text>

        <Pressable
          style={[styles.devButton, registering && styles.devButtonDisabled]}
          onPress={handleRegisterCurrentLocation}
          disabled={registering}
        >
          <Ionicons name="pin" size={20} color="#4ade80" />
          <Text style={styles.devButtonTextGreen}>
            {registering ? 'Getting Location...' : 'Register Current Location as Cinema'}
          </Text>
        </Pressable>

        <Pressable style={styles.devButton} onPress={handleSimulateVisit}>
          <Ionicons name="bug" size={20} color="#fbbf24" />
          <Text style={styles.devButtonText}>Simulate Visit at Current Location</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
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
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 10,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  devButtonDisabled: {
    opacity: 0.6,
  },
  devButtonText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  devButtonTextGreen: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
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
