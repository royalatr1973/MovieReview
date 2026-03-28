import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '../../src/hooks/usePermissions';
import { useAuthStore } from '../../src/stores/auth';

export default function PermissionsScreen() {
  const router = useRouter();
  const { requestLocationPermission, requestNotificationPermission } = usePermissions();
  const { completeOnboarding } = useAuthStore();
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  const handleLocation = async () => {
    const granted = await requestLocationPermission();
    setLocationGranted(granted);
    if (!granted) {
      Alert.alert(
        'Location Required',
        'CineReview needs background location access to detect cinema visits. You can enable this later in Settings.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
  };

  const handleContinue = async () => {
    await completeOnboarding();
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Permissions</Text>
      <Text style={styles.subtitle}>
        CineReview needs a couple of permissions to work its magic
      </Text>

      <View style={styles.permissions}>
        <PermissionCard
          icon="location"
          title="Location Access"
          description="Detect when you visit a cinema so we can prompt you to review. We use background location for automatic detection."
          granted={locationGranted}
          onPress={handleLocation}
          required
        />

        <PermissionCard
          icon="notifications"
          title="Notifications"
          description="Get a gentle nudge to rate the movie after leaving a cinema."
          granted={notifGranted}
          onPress={handleNotifications}
          required={false}
        />
      </View>

      <Pressable style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueText}>
          {locationGranted ? 'Continue' : 'Skip for Now'}
        </Text>
      </Pressable>

      {!locationGranted && (
        <Text style={styles.skipNote}>
          You can still add reviews manually without location access
        </Text>
      )}
    </View>
  );
}

function PermissionCard({
  icon,
  title,
  description,
  granted,
  onPress,
  required,
}: {
  icon: string;
  title: string;
  description: string;
  granted: boolean;
  onPress: () => void;
  required: boolean;
}) {
  return (
    <View style={[styles.card, granted && styles.cardGranted]}>
      <View style={styles.cardHeader}>
        <Ionicons
          name={icon as any}
          size={24}
          color={granted ? '#4ade80' : '#e94560'}
        />
        <Text style={styles.cardTitle}>{title}</Text>
        {required && !granted && (
          <Text style={styles.requiredBadge}>Recommended</Text>
        )}
        {granted && (
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
        )}
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
      {!granted && (
        <Pressable style={styles.enableButton} onPress={onPress}>
          <Text style={styles.enableText}>Enable</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0b0',
    marginBottom: 32,
  },
  permissions: {
    gap: 16,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  cardGranted: {
    borderColor: '#4ade80',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  requiredBadge: {
    fontSize: 11,
    color: '#e94560',
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    color: '#a0a0b0',
    marginBottom: 12,
  },
  enableButton: {
    backgroundColor: '#e94560',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  enableText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#0f3460',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipNote: {
    fontSize: 12,
    color: '#a0a0b0',
    textAlign: 'center',
    marginTop: 12,
  },
});
