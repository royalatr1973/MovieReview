import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api-client';

interface MovieDetail {
  id: string;
  title: string;
  year: number | null;
  language: string | null;
  format: string | null;
  averageRating: number | null;
  reviewCount: number;
}

interface MovieReview {
  id: string;
  rating: number;
  reviewText: string | null;
  spoilerFlag: boolean;
  createdAt: string;
  user: { displayName: string | null };
}

export default function MovieDetailScreen() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [reviews, setReviews] = useState<MovieReview[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [movieRes, reviewsRes] = await Promise.all([
        api.get<MovieDetail>(`/movies/${movieId}`),
        api.get<{ data: MovieReview[] }>(`/movies/${movieId}/reviews`),
      ]);
      setMovie(movieRes);
      setReviews(reviewsRes.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const renderStars = (rating: number, size: number = 16) => (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color="#fbbf24"
        />
      ))}
    </View>
  );

  const renderHeader = () => {
    if (!movie) return null;
    return (
      <View style={styles.header}>
        <Text style={styles.title}>{movie.title}</Text>
        {movie.year && <Text style={styles.year}>{movie.year}</Text>}
        {movie.language && (
          <Text style={styles.meta}>
            {movie.language}{movie.format ? ` · ${movie.format}` : ''}
          </Text>
        )}

        <View style={styles.summaryCard}>
          {movie.averageRating !== null ? (
            <>
              <View style={styles.ratingRow}>
                {renderStars(Math.round(movie.averageRating), 24)}
                <Text style={styles.avgRating}>{movie.averageRating.toFixed(1)}</Text>
              </View>
              <Text style={styles.reviewCountText}>
                {movie.reviewCount} {movie.reviewCount === 1 ? 'review' : 'reviews'}
              </Text>
            </>
          ) : (
            <Text style={styles.noReviewsText}>No reviews yet</Text>
          )}
        </View>

        {reviews.length > 0 && (
          <Text style={styles.sectionTitle}>All Reviews</Text>
        )}
      </View>
    );
  };

  const renderReviewItem = ({ item }: { item: MovieReview }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {renderStars(item.rating)}
        <Text style={styles.reviewerName}>
          {item.user.displayName || 'Anonymous'}
        </Text>
      </View>
      {item.reviewText && (
        <Text style={styles.reviewText}>
          {item.spoilerFlag ? '[Spoiler] ' : ''}
          {item.reviewText}
        </Text>
      )}
      <Text style={styles.reviewDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />
      }
      ListHeaderComponent={renderHeader}
      data={reviews}
      keyExtractor={(item) => item.id}
      renderItem={renderReviewItem}
      ListEmptyComponent={
        movie ? (
          <View style={styles.emptyReviews}>
            <Ionicons name="chatbubble-outline" size={36} color="#6b7280" />
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySubtext}>
              Be the first to review this movie!
            </Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  loadingText: {
    color: '#a0a0b0',
    fontSize: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  year: {
    fontSize: 16,
    color: '#a0a0b0',
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  avgRating: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  reviewCountText: {
    fontSize: 14,
    color: '#a0a0b0',
  },
  noReviewsText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a0a0b0',
  },
  reviewText: {
    fontSize: 15,
    color: '#e0e0e0',
    lineHeight: 22,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#a0a0b0',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
