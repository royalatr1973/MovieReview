import { View, Text, StyleSheet, Switch, Pressable, Alert, ScrollView, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth';
import { useVisitStore } from '../../src/stores/visits';
import { useSettingsStore } from '../../src/stores/settings';
import { useState } from 'react';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { simulateVisitAtCurrentLocation } = useVisitStore();
  const { testDwellMinutes, testGeofenceRadius, setTestDwellMinutes, setTestGeofenceRadius } = useSettingsStore();
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [registering, setRegistering] = useState(false);

  const handleRegisterCurrentLocation = async () => {
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        Alert.alert('Error', 'Geolocation is not supported by this browser.');
        return;
      }
      setRegistering(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          Alert.alert(
            'Cinema Registered!',
            `Your current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) is now registered as "My Test Cinema".\n\nNote: Geofencing only works on native apps. On web, use "Simulate Visit" instead.`,
          );
          setRegistering(false);
        },
        (error) => {
          Alert.alert('Error', error.message || 'Failed to get location');
          setRegistering(false);
        },
        { enableHighAccuracy: true },
      );
      return;
    }

    // Native: use expo-location
    setRegistering(true);
    try {
      const Location = require('expo-location');
      const { registerGeofences } = require('../../src/services/geofence');

      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Foreground location permission is needed.');
        return;
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Background location permission is needed for geofencing. Please enable "Allow all the time" in app settings.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      await registerGeofences([
        {
          id: 'my-test-cinema',
          name: 'My Test Cinema',
          latitude,
          longitude,
          radius: testGeofenceRadius,
        },
      ]);

      Alert.alert(
        'Cinema Registered!',
        `Your current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) is now registered as "My Test Cinema" with a ${testGeofenceRadius}m geofence.\n\nDwell time for review: ${testDwellMinutes} min\n\nWalk ${testGeofenceRadius}m+ away and come back to trigger a visit.`,
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to get location');
    } finally {
      setRegistering(false);
    }
  };

  const handleSimulateVisit = async () => {
    if (Platform.OS === 'web') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            simulateVisitAtCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            Alert.alert('Visit Simulated!', 'A cinema visit at your current location has been created. Check the Home tab.');
          },
          () => {
            simulateVisitAtCurrentLocation(null);
            Alert.alert('Visit Simulated!', 'A test cinema visit has been created (default location). Check the Home tab.');
          },
          { enableHighAccuracy: true },
        );
      } else {
        simulateVisitAtCurrentLocation(null);
        Alert.alert('Visit Simulated!', 'A test cinema visit has been created. Check the Home tab.');
      }
      return;
    }

    // Native: use expo-location
    try {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        simulateVisitAtCurrentLocation(null);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      simulateVisitAtCurrentLocation(location.coords);

      Alert.alert(
        'Visit Simulated!',
        'A cinema visit at your current location has been created. Check the Home tab.',
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

  const dwellOptions = [1, 2, 5, 15, 30, 45];
  const radiusOptions = [50, 100, 200, 500];

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
        <Text style={styles.sectionTitle}>Testing Configuration</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Minimum Dwell Time (minutes)</Text>
          <Text style={styles.hint}>How long you need to stay for a visit to count</Text>
          <View style={styles.chipRow}>
            {dwellOptions.map((mins) => (
              <Pressable
                key={mins}
                style={[styles.chip, testDwellMinutes === mins && styles.chipActive]}
                onPress={() => setTestDwellMinutes(mins)}
              >
                <Text style={[styles.chipText, testDwellMinutes === mins && styles.chipTextActive]}>
                  {mins}m
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.card, { marginTop: 8 }]}>
          <Text style={styles.label}>Geofence Radius (meters)</Text>
          <Text style={styles.hint}>Distance from cinema center to trigger detection</Text>
          <View style={styles.chipRow}>
            {radiusOptions.map((r) => (
              <Pressable
                key={r}
                style={[styles.chip, testGeofenceRadius === r && styles.chipActive]}
                onPress={() => setTestGeofenceRadius(r)}
              >
                <Text style={[styles.chipText, testGeofenceRadius === r && styles.chipTextActive]}>
                  {r}m
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testing Actions</Text>

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
  hint: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 10,
  },
  value: {
    fontSize: 16,
    color: '#ffffff',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0f3460',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  chipActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  chipText: {
    color: '#a0a0b0',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
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
