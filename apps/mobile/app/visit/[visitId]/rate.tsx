import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { DWELL_THRESHOLDS } from '@moviereview/shared';
import { StarRatingInput } from '../../../src/components/review/StarRatingInput';
import { useReviewStore } from '../../../src/stores/reviews';
import { useVisitStore } from '../../../src/stores/visits';

export default function RateScreen() {
  const router = useRouter();
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { selectedMovie, submitReview } = useReviewStore();
  const { getVisit } = useVisitStore();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [spoilerFlag, setSpoilerFlag] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const visit = getVisit(visitId);
  const movieTitle = selectedMovie?.rawTitle || selectedMovie?.movieId || 'Unknown';

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await submitReview({
        visitId,
        movieId: selectedMovie?.movieId ?? undefined,
        rawTitle: selectedMovie?.rawTitle ?? undefined,
        rating,
        reviewText: reviewText.trim() || undefined,
        spoilerFlag,
        selectionSource: selectedMovie?.selectionSource || 'manual',
        clientEventId: uuidv4(),
      });

      // Check if user might have watched another movie
      const dwell = visit?.dwellMinutes ?? 0;
      if (dwell >= DWELL_THRESHOLDS.MULTI_MOVIE_THRESHOLD) {
        Alert.alert(
          'Another Movie?',
          'Did you watch another movie during this visit?',
          [
            {
              text: 'No, done',
              onPress: () => router.dismissAll(),
            },
            {
              text: 'Yes',
              onPress: () => router.replace(`/visit/${visitId}/select-movie`),
            },
          ]
        );
      } else {
        Alert.alert('Review Submitted!', 'Thanks for your review.', [
          { text: 'OK', onPress: () => router.dismissAll() },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to submit review. It will be saved locally and synced later.');
      router.dismissAll();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.movieTitle}>{movieTitle}</Text>

        <View style={styles.ratingSection}>
          <Text style={styles.label}>Your Rating</Text>
          <StarRatingInput value={rating} onChange={setRating} />
        </View>

        <View style={styles.textSection}>
          <Text style={styles.label}>Review (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What did you think of the movie?"
            placeholderTextColor="#6b7280"
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.spoilerRow}>
          <Text style={styles.spoilerLabel}>Contains spoilers</Text>
          <Switch
            value={spoilerFlag}
            onValueChange={setSpoilerFlag}
            trackColor={{ false: '#0f3460', true: '#e94560' }}
            thumbColor="#ffffff"
          />
        </View>

        <Pressable
          style={[styles.submitButton, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  content: {
    padding: 24,
  },
  movieTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#a0a0b0',
    marginBottom: 8,
  },
  textSection: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  spoilerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  spoilerLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#e94560',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
