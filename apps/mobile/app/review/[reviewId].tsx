import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StarRatingInput } from '../../src/components/review/StarRatingInput';
import { useReviewStore } from '../../src/stores/reviews';
import { REVIEW_EDIT_WINDOW_HOURS } from '@moviereview/shared';

export default function ReviewDetailScreen() {
  const router = useRouter();
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const { getReview, updateReview, deleteReview } = useReviewStore();

  const review = getReview(reviewId);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [reviewText, setReviewText] = useState(review?.reviewText ?? '');

  if (!review) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Review not found</Text>
      </View>
    );
  }

  const hoursSinceCreation =
    (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60);
  const canEdit = hoursSinceCreation <= REVIEW_EDIT_WINDOW_HOURS;

  const handleSave = async () => {
    try {
      await updateReview(reviewId, { rating, reviewText: reviewText.trim() || undefined });
      setEditing(false);
      Alert.alert('Saved', 'Your review has been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Review', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteReview(reviewId);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.movieTitle}>
        {review.rawTitle || review.movieId || 'Unknown Movie'}
      </Text>

      <View style={styles.ratingSection}>
        {editing ? (
          <StarRatingInput value={rating} onChange={setRating} />
        ) : (
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= review.rating ? 'star' : 'star-outline'}
                size={28}
                color="#fbbf24"
              />
            ))}
          </View>
        )}
      </View>

      {editing ? (
        <TextInput
          style={styles.textInput}
          value={reviewText}
          onChangeText={setReviewText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      ) : (
        review.reviewText && (
          <View style={styles.reviewTextContainer}>
            {review.spoilerFlag && (
              <Text style={styles.spoilerWarning}>Contains spoilers</Text>
            )}
            <Text style={styles.reviewText}>{review.reviewText}</Text>
          </View>
        )
      )}

      <View style={styles.meta}>
        <Text style={styles.metaText}>
          Reviewed {new Date(review.createdAt).toLocaleDateString()}
        </Text>
        {review.editedAt && (
          <Text style={styles.metaText}>
            Edited {new Date(review.editedAt).toLocaleDateString()}
          </Text>
        )}
        <Text style={styles.metaText}>Source: {review.selectionSource}</Text>
      </View>

      <View style={styles.actions}>
        {editing ? (
          <>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save Changes</Text>
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setRating(review.rating);
                setReviewText(review.reviewText ?? '');
                setEditing(false);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            {canEdit && (
              <Pressable style={styles.editButton} onPress={() => setEditing(true)}>
                <Ionicons name="create-outline" size={18} color="#ffffff" />
                <Text style={styles.editText}>Edit Review</Text>
              </Pressable>
            )}
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
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
    marginBottom: 16,
    textAlign: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewTextContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  spoilerWarning: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  reviewText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
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
    marginBottom: 16,
  },
  meta: {
    marginBottom: 24,
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  actions: {
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f3460',
    paddingVertical: 14,
    borderRadius: 12,
  },
  editText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#e94560',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#a0a0b0',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
