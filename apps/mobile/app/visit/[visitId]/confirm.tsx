import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVisitStore } from '../../../src/stores/visits';
import { DWELL_THRESHOLDS } from '@moviereview/shared';

export default function ConfirmScreen() {
  const router = useRouter();
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { getVisit, updateVisitPromptState } = useVisitStore();

  const visit = getVisit(visitId);

  if (!visit) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Visit not found</Text>
      </View>
    );
  }

  const handleYes = () => {
    updateVisitPromptState(visitId, 'completed');
    router.push(`/visit/${visitId}/select-movie`);
  };

  const handleNo = () => {
    updateVisitPromptState(visitId, 'dismissed');
    router.back();
  };

  const showMultiMovieHint =
    (visit.dwellMinutes ?? 0) >= DWELL_THRESHOLDS.MULTI_MOVIE_THRESHOLD;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="film" size={64} color="#e94560" />
      </View>

      <Text style={styles.title}>Did you watch a movie?</Text>
      <Text style={styles.subtitle}>
        It looks like you were at {visit.cinemaName || 'a cinema'} for about{' '}
        {visit.dwellMinutes} minutes.
      </Text>

      {showMultiMovieHint && (
        <Text style={styles.hint}>
          That's quite a long visit! You can add multiple movies if you watched
          more than one.
        </Text>
      )}

      <View style={styles.buttons}>
        <Pressable style={styles.yesButton} onPress={handleYes}>
          <Ionicons name="checkmark" size={24} color="#ffffff" />
          <Text style={styles.yesText}>Yes, I watched a movie</Text>
        </Pressable>

        <Pressable style={styles.noButton} onPress={handleNo}>
          <Ionicons name="close" size={24} color="#a0a0b0" />
          <Text style={styles.noText}>No, I didn't</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0b0',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#fbbf24',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  buttons: {
    width: '100%',
    gap: 12,
    marginTop: 32,
  },
  yesButton: {
    backgroundColor: '#e94560',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  yesText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noButton: {
    backgroundColor: '#1a1a2e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  noText: {
    color: '#a0a0b0',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
});
