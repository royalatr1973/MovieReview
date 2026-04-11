import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="film-outline" size={80} color="#e94560" />
      </View>

      <Text style={styles.title}>CineReview</Text>
      <Text style={styles.subtitle}>
        Rate movies right after you watch them
      </Text>

      <View style={styles.features}>
        <FeatureItem
          icon="location-outline"
          title="Auto-detect cinema visits"
          description="We'll know when you're at a cinema and prompt you to review"
        />
        <FeatureItem
          icon="star-outline"
          title="Quick ratings"
          description="Rate and review movies with just a few taps"
        />
        <FeatureItem
          icon="compass-outline"
          title="Discover ratings"
          description="Browse reviews by movie, cinema, or area"
        />
      </View>

      <Pressable
        style={styles.button}
        onPress={() => router.push('/(onboarding)/login')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={24} color="#e94560" style={styles.featureIcon} />
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1a1a2e',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0b0',
    textAlign: 'center',
    marginBottom: 40,
  },
  features: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#a0a0b0',
  },
  button: {
    backgroundColor: '#e94560',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
