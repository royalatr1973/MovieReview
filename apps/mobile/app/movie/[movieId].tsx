import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Image,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMovieStore } from '../../src/stores/movies';
import { useReviewStore } from '../../src/stores/reviews';
import type { LocalMovie } from '../../src/db/movies';

// ── Animated rating component (Phase 4B) ──────────────────────────────────
function AnimatedAvgRating({ value }: { value: number | null }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value && value !== null) {
      prevValue.current = value;
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.4,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value]);

  if (value === null) {
    return <Text style={styles.noReviewsText}>No reviews yet</Text>;
  }

  return (
    <Animated.Text
      style={[styles.avgRating, { transform: [{ scale: scaleAnim }] }]}
    >
      {value.toFixed(1)}
    </Animated.Text>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function MovieDetailScreen() {
  const router = useRouter();
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const { loadMovies, getMovieById } = useMovieStore();
  const { reviews } = useReviewStore();

  const [movie, setMovie] = useState<LocalMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reviews that belong to this movie (local, from Zustand)
  const movieReviews = reviews.filter((r) => r.movieId === movieId);

  const loadData = useCallback(async () => {
    // Try from Zustand cache first (instant)
    const cached = getMovieById(movieId);
    if (cached) setMovie(cached);

    // Reload movie store (picks up latest SQLite stats)
    await loadMovies();
    const fresh = useMovieStore.getState().getMovieById(movieId);
    if (fresh) setMovie(fresh);

    setLoading(false);
  }, [movieId]);

  useEffect(() => {
    loadData();
  }, []);

  // Re-read whenever movie store updates (e.g. after review submit)
  const movies = useMovieStore((s) => s.movies);
  useEffect(() => {
    const fresh = movies.find((m) => m.id === movieId);
    if (fresh) setMovie(fresh);
  }, [movies, movieId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const renderStars = (rating: number, size = 16) => (
    <View style={styles.starsRow}>
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
    const rounded = Math.round(movie.averageRating ?? 0);
    return (
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#e94560" />
          <Text style={styles.backText}>Movies</Text>
        </Pressable>

        {/* Poster + title row */}
        <View style={styles.titleRow}>
          {movie.posterUrl ? (
            <Image
              source={{ uri: movie.posterUrl }}
              style={styles.poster}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{movie.title}</Text>
            {movie.year ? (
              <Text style={styles.year}>{movie.year}</Text>
            ) : null}
            {movie.language ? (
              <Text style={styles.meta}>
                {movie.language}
                {movie.format ? ` · ${movie.format}` : ''}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Summary card with animated rating */}
        <View style={styles.summaryCard}>
          {movie.reviewCount > 0 ? (
            <>
              <View style={styles.ratingRow}>
                {renderStars(rounded, 24)}
                <AnimatedAvgRating value={movie.averageRating} />
              </View>
              <Text style={styles.reviewCountText}>
                {movie.reviewCount}{' '}
                {movie.reviewCount === 1 ? 'review' : 'reviews'}
              </Text>
            </>
          ) : (
            <AnimatedAvgRating value={null} />
          )}
        </View>

        {movieReviews.length > 0 && (
          <Text style={styles.sectionTitle}>Reviews</Text>
        )}
      </View>
    );
  };

  const renderReviewItem = ({ item }: { item: typeof movieReviews[0] }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {renderStars(item.rating)}
        <Text style={styles.reviewerName}>You</Text>
      </View>
      {item.reviewText ? (
        <Text style={styles.reviewText}>
          {item.spoilerFlag ? '[Spoiler] ' : ''}
          {item.reviewText}
        </Text>
      ) : null}
      <Text style={styles.reviewDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  if (loading && !movie) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="film-outline" size={48} color="#a0a0b0" />
        <Text style={styles.loadingText}>Movie not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#e94560' }}>← Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#e94560"
        />
      }
      ListHeaderComponent={renderHeader}
      data={movieReviews}
      keyExtractor={(item) => item.reviewId}
      renderItem={renderReviewItem}
      ListEmptyComponent={
        <View style={styles.emptyReviews}>
          <Ionicons name="chatbubble-outline" size={36} color="#6b7280" />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>
            Be the first to review this movie!
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e' },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  loadingText: { color: '#a0a0b0', fontSize: 16 },
  header: { marginBottom: 8 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: { color: '#e94560', fontSize: 16, marginLeft: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#0f3460',
  },
  titleBlock: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  year: { fontSize: 15, color: '#a0a0b0', marginBottom: 2 },
  meta: { fontSize: 13, color: '#6b7280' },
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
  starsRow: { flexDirection: 'row' },
  avgRating: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  reviewCountText: { fontSize: 14, color: '#a0a0b0' },
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
  reviewDate: { fontSize: 12, color: '#6b7280' },
  emptyReviews: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#a0a0b0', marginTop: 10 },
  emptySubtext: { fontSize: 13, color: '#6b7280', marginTop: 4 },
});
