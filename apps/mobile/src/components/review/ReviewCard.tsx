import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Review } from '@moviereview/shared';

interface ReviewCardProps {
  review: Review & { syncStatus?: string };
  onPress?: () => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date}, ${time}`;
}

export function ReviewCard({ review, onPress }: ReviewCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {review.rawTitle || review.movieId || 'Unknown Movie'}
        </Text>
        {review.syncStatus === 'pending' && (
          <Ionicons name="cloud-upload-outline" size={16} color="#fbbf24" />
        )}
        {review.syncStatus === 'synced' && (
          <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
        )}
        {review.syncStatus === 'failed' && (
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
        )}
      </View>

      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= review.rating ? 'star' : 'star-outline'}
            size={16}
            color="#fbbf24"
          />
        ))}
        <Text style={styles.ratingNum}>{review.rating}/5</Text>
      </View>

      {review.reviewText && (
        <Text style={styles.text} numberOfLines={2}>
          {review.spoilerFlag ? '[Spoiler] ' : ''}
          {review.reviewText}
        </Text>
      )}

      <View style={styles.dateRow}>
        <Text style={styles.date}>
          {formatDateTime(review.createdAt)}
        </Text>
        {review.editedAt ? (
          <Text style={styles.editedBadge}>(edited)</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingNum: {
    fontSize: 12,
    color: '#a0a0b0',
    marginLeft: 6,
  },
  text: {
    fontSize: 14,
    color: '#a0a0b0',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
  },
  editedBadge: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});
