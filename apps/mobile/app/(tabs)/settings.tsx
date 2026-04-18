import { View, Text, StyleSheet, Switch, Pressable, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth';
import { useVisitStore } from '../../src/stores/visits';
import { useSettingsStore } from '../../src/stores/settings';
import { useState, useEffect, useRef } from 'react';
import { haversineDistance } from '../../src/services/geofence';
import { CHENNAI_CINEMAS } from '../../src/data/chennai-cinemas';

interface NearestCinema {
  id: string;
  name: string;
  distance: number; // meters
  latitude: number;
  longitude: number;
  radius: number;
}

interface GeofenceMonitorState {
  myLat: number | null;
  myLon: number | null;
  accuracy: number | null;
  nearest: NearestCinema | null;
  insideGeofence: boolean;
  entryTime: string | null;
  dwellSeconds: number;
  lastUpdate: string;
}

function LiveGeofenceMonitor() {
  const [state, setState] = useState<GeofenceMonitorState>({
    myLat: null,
    myLon: null,
    accuracy: null,
    nearest: null,
    insideGeofence: false,
    entryTime: null,
    dwellSeconds: 0,
    lastUpdate: '',
  });

  const wasInsideRef = useRef(false);
  const entryTimeRef = useRef<Date | null>(null);
  const dwellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let locationSub: any = null;

    const startWatching = async () => {
      try {
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        locationSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 1,
          },
          (loc: any) => {
            const { latitude, longitude, accuracy } = loc.coords;
            const now = new Date();

            // Find nearest cinema
            let nearest: NearestCinema | null = null;
            let minDist = Infinity;
            for (const c of CHENNAI_CINEMAS) {
              const d = haversineDistance(latitude, longitude, c.latitude, c.longitude);
              if (d < minDist) {
                minDist = d;
                nearest = {
                  id: c.id,
                  name: c.name,
                  distance: Math.round(d),
                  latitude: c.latitude,
                  longitude: c.longitude,
                  radius: c.radius,
                };
              }
            }

            const insideGeofence = nearest ? nearest.distance <= nearest.radius : false;

            // Detect enter
            if (insideGeofence && !wasInsideRef.current) {
              entryTimeRef.current = now;
              wasInsideRef.current = true;
              // Start dwell timer
              if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current);
              dwellIntervalRef.current = setInterval(() => {
                if (entryTimeRef.current) {
                  const elapsed = Math.floor((Date.now() - entryTimeRef.current.getTime()) / 1000);
                  setState((s) => ({ ...s, dwellSeconds: elapsed }));
                }
              }, 1000);
            }

            // Detect exit
            if (!insideGeofence && wasInsideRef.current) {
              wasInsideRef.current = false;
              if (dwellIntervalRef.current) {
                clearInterval(dwellIntervalRef.current);
                dwellIntervalRef.current = null;
              }
              const totalDwell = entryTimeRef.current
                ? Math.floor((now.getTime() - entryTimeRef.current.getTime()) / 1000)
                : 0;
              entryTimeRef.current = null;
              setState((s) => ({
                ...s,
                myLat: latitude,
                myLon: longitude,
                accuracy: accuracy ? Math.round(accuracy) : null,
                nearest,
                insideGeofence: false,
                entryTime: null,
                dwellSeconds: totalDwell,
                lastUpdate: now.toLocaleTimeString(),
              }));
              return;
            }

            setState((s) => ({
              ...s,
              myLat: latitude,
              myLon: longitude,
              accuracy: accuracy ? Math.round(accuracy) : null,
              nearest,
              insideGeofence,
              entryTime: insideGeofence && entryTimeRef.current
                ? entryTimeRef.current.toLocaleTimeString()
                : s.entryTime,
              lastUpdate: now.toLocaleTimeString(),
            }));
          }
        );
      } catch (err) {
        console.error('[GeofenceMonitor] Error:', err);
      }
    };

    startWatching();

    return () => {
      if (locationSub) locationSub.remove();
      if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current);
    };
  }, []);

  const formatDwell = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const { nearest, insideGeofence } = state;

  return (
    <View style={monStyles.container}>
      <View style={monStyles.headerRow}>
        <Ionicons name="radio" size={18} color="#38bdf8" />
        <Text style={monStyles.headerText}>Live Geofence Monitor</Text>
        {state.lastUpdate ? (
          <Text style={monStyles.updateTime}>{state.lastUpdate}</Text>
        ) : (
          <Text style={monStyles.updateTime}>Starting...</Text>
        )}
      </View>

      {/* My Position */}
      <View style={monStyles.row}>
        <Text style={monStyles.label}>My Position</Text>
        <Text style={monStyles.value}>
          {state.myLat !== null
            ? `${state.myLat.toFixed(5)}, ${state.myLon?.toFixed(5)}`
            : 'Acquiring GPS...'}
        </Text>
      </View>

      {state.accuracy !== null && (
        <View style={monStyles.row}>
          <Text style={monStyles.label}>GPS Accuracy</Text>
          <Text style={[monStyles.value, { color: state.accuracy <= 10 ? '#4ade80' : state.accuracy <= 30 ? '#fbbf24' : '#ef4444' }]}>
            {'\u00B1'}{state.accuracy}m
          </Text>
        </View>
      )}

      {/* Nearest Cinema */}
      {nearest && (
        <>
          <View style={monStyles.divider} />
          <View style={monStyles.row}>
            <Text style={monStyles.label}>Nearest Cinema</Text>
            <Text style={monStyles.value} numberOfLines={1}>{nearest.name}</Text>
          </View>
          <View style={monStyles.row}>
            <Text style={monStyles.label}>Distance</Text>
            <Text style={[monStyles.valueBig, { color: insideGeofence ? '#4ade80' : nearest.distance <= nearest.radius * 2 ? '#fbbf24' : '#ffffff' }]}>
              {nearest.distance >= 1000
                ? `${(nearest.distance / 1000).toFixed(2)} km`
                : `${nearest.distance} m`}
            </Text>
          </View>
          <View style={monStyles.row}>
            <Text style={monStyles.label}>Geofence Radius</Text>
            <Text style={monStyles.value}>{nearest.radius}m</Text>
          </View>
        </>
      )}

      {/* Geofence Status */}
      <View style={monStyles.divider} />
      <View style={monStyles.statusRow}>
        <View style={[monStyles.statusDot, { backgroundColor: insideGeofence ? '#4ade80' : '#ef4444' }]} />
        <Text style={[monStyles.statusText, { color: insideGeofence ? '#4ade80' : '#ef4444' }]}>
          {insideGeofence ? 'INSIDE GEOFENCE' : 'OUTSIDE GEOFENCE'}
        </Text>
      </View>

      {/* Entry Time & Dwell */}
      {state.entryTime && (
        <View style={monStyles.row}>
          <Text style={monStyles.label}>Entry Time</Text>
          <Text style={monStyles.value}>{state.entryTime}</Text>
        </View>
      )}

      {(insideGeofence || state.dwellSeconds > 0) && (
        <View style={monStyles.row}>
          <Text style={monStyles.label}>{insideGeofence ? 'Dwell Time' : 'Last Dwell'}</Text>
          <Text style={[monStyles.valueBig, { color: '#38bdf8' }]}>
            {formatDwell(state.dwellSeconds)}
          </Text>
        </View>
      )}
    </View>
  );
}

const monStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1b36',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  updateTime: {
    color: '#6b7280',
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  label: {
    color: '#a0a0b0',
    fontSize: 12,
  },
  value: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  valueBig: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e3a5f',
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { simulateVisitAtCurrentLocation } = useVisitStore();
  const {
    testDwellMinutes,
    testGeofenceRadius,
    cinemaDetectionEnabled,
    reviewNotificationsEnabled,
    setTestDwellMinutes,
    setTestGeofenceRadius,
    setCinemaDetectionEnabled,
    setReviewNotificationsEnabled,
  } = useSettingsStore();
  const [registering, setRegistering] = useState(false);

  const handleToggleCinemaDetection = async (enabled: boolean) => {
    setCinemaDetectionEnabled(enabled);
    if (Platform.OS === 'web') return;
    try {
      const { registerGeofences, stopGeofencing, startForegroundKeepalive, stopForegroundKeepalive } =
        require('../../src/services/geofence');
      if (enabled) {
        const { getDatabase } = require('../../src/db/database');
        const { getActiveCinemas } = require('../../src/db/cinemas');
        const db = await getDatabase();
        if (db) {
          const cinemas = await getActiveCinemas(db);
          await registerGeofences(cinemas);
        }
        await startForegroundKeepalive();
        Alert.alert('Cinema Detection', 'Geofencing enabled.');
      } else {
        await stopGeofencing();
        await stopForegroundKeepalive();
        Alert.alert('Cinema Detection', 'Geofencing disabled.');
      }
    } catch (err) {
      console.error('[Settings] Toggle cinema detection failed:', err);
      Alert.alert('Error', 'Failed to update cinema detection.');
    }
  };

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

      // Ensure notification permission is granted
      const Notifications = require('expo-notifications');
      const { status: notifStatus } = await Notifications.getPermissionsAsync();
      if (notifStatus !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permission Needed', 'Notification permission is required to get review prompts when you leave a cinema.');
        }
      }

      const { registerGeofences, recordManualEntry } = require('../../src/services/geofence');

      await registerGeofences([
        {
          id: 'my-test-cinema',
          name: 'My Test Cinema',
          latitude,
          longitude,
          radius: testGeofenceRadius,
        },
      ]);

      // Record the entry now so exit event can calculate dwell time
      await recordManualEntry('my-test-cinema');

      Alert.alert(
        'Cinema Registered!',
        `Your current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) is now registered as "My Test Cinema" with a ${testGeofenceRadius}m geofence.\n\nEntry time recorded NOW. Walk ${testGeofenceRadius}m+ away to trigger exit and get a notification.`,
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
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(onboarding)/welcome');
        },
      },
    ]);
  };

  const dwellOptions = [1, 2, 5, 15, 30, 45];
  const radiusOptions = [15, 50, 100, 200, 500];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || 'Not logged in'}</Text>
        </View>
      </View>

      {/* Live Geofence Monitor — only on native */}
      {Platform.OS !== 'web' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geofence Monitor</Text>
          <LiveGeofenceMonitor />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="location" size={20} color="#e94560" />
            <Text style={styles.settingLabel}>Cinema Detection</Text>
          </View>
          <Switch
            value={cinemaDetectionEnabled}
            onValueChange={handleToggleCinemaDetection}
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
            value={reviewNotificationsEnabled}
            onValueChange={setReviewNotificationsEnabled}
            trackColor={{ false: '#0f3460', true: '#e94560' }}
            thumbColor="#ffffff"
          />
        </View>

        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/notifications/preferences')}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="options" size={20} color="#e94560" />
            <Text style={styles.settingLabel}>Notification Preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#a0a0b0" />
        </Pressable>
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
