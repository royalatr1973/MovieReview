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
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMovieStore } from '../../src/stores/movies';
import { useReviewStore } from '../../src/stores/reviews';
import { useWatchlistStore } from '../../src/stores/watchlist';
import { api } from '../../src/services/api-client';
import type { LocalMovie } from '../../src/db/movies';

interface ServerReview {
  id: string;
  rating: number;
  reviewText: string | null;
  spoilerFlag: boolean;
  createdAt: string;
  user: { displayName: string | null };
}

// ── Animated rating component ─────────────────────────────────────────────
function AnimatedAvgRating({ value }: { value: number | null }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value && value !== null) {
      prevValue.current = value;
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.4, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [value]);

  if (value === null) return <Text style={styles.noReviewsText}>No reviews yet</Text>;
  return (
    <Animated.Text style={[styles.avgRating, { transform: [{ scale: scaleAnim }] }]}>
      {value.toFixed(1)}
    </Animated.Text>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function MovieDetailScreen() {
  const router = useRouter();
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const { loadMovies, getMovieById } = useMovieStore();
  const { reviews: localReviews } = useReviewStore();
  const { isWatchlisted, add: addWatchlist, remove: removeWatchlist, load: loadWatchlist } = useWatchlistStore();

  const [movie, setMovie] = useState<LocalMovie | null>(null);
  const [serverReviews, setServerReviews] = useState<ServerReview[]>([]);
  const [serverAvg, setServerAvg] = useState<number | null>(null);
  const [serverCount, setServerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const watchlisted = isWatchlisted(movieId);

  const loadData = useCallback(async () => {
    // Local movie data
    const cached = getMovieById(movieId);
    if (cached) setMovie(cached);

    await loadMovies();
    const fresh = useMovieStore.getState().getMovieById(movieId);
    if (fresh) setMovie(fresh);

    // Load watchlist state
    await loadWatchlist();

    // Fetch ALL reviews from server (includes other users)
    try {
      const res = await api.get<{
        data: ServerReview[];
        total: number;
      }>(`/movies/${movieId}/reviews?limit=50`);
      setServerReviews(res.data);
      setServerCount(res.total);
    } catch {
      // Offline — fall back to local reviews
    }

    // Fetch server-side aggregate rating
    try {
      const detail = await api.get<{ averageRating: number | null; reviewCount: number }>(
        `/movies/${movieId}`
      );
      setServerAvg(detail.averageRating);
      setServerCount(detail.reviewCount);
    } catch {
      // Use local data
    }

    setLoading(false);
  }, [movieId]);

  useEffect(() => { loadData(); }, [loadData]);

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

  const toggleWatchlist = () => {
    if (watchlisted) {
      removeWatchlist(movieId);
    } else if (movie) {
      addWatchlist({
        movieId: movie.id,
        title: movie.title,
        year: movie.year,
        language: movie.language,
        posterUrl: movie.posterUrl,
      });
    }
  };

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

  // Merge server reviews with local ones (prefer server data)
  const allReviews: ServerReview[] = serverReviews.length > 0
    ? serverReviews
    : localReviews
        .filter((r) => r.movieId === movieId)
        .map((r) => ({
          id: r.reviewId,
          rating: r.rating,
          reviewText: r.reviewText,
          spoilerFlag: r.spoilerFlag,
          createdAt: r.createdAt,
          user: { displayName: 'You' },
        }));

  const avgRating = serverAvg ?? movie?.averageRating ?? null;
  const totalReviews = serverCount || movie?.reviewCount || 0;

  const renderHeader = () => {
    if (!movie) return null;
    const rounded = Math.round(avgRating ?? 0);
    return (
      <View style={styles.header}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#e94560" />
            <Text style={styles.backText}>Movies</Text>
          </Pressable>
          <Pressable onPress={toggleWatchlist} style={styles.watchlistBtn}>
            <Ionicons
              name={watchlisted ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={watchlisted ? '#fbbf24' : '#a0a0b0'}
            />
          </Pressable>
        </View>

        {/* Poster + title row */}
        <View style={styles.titleRow}>
          {movie.posterUrl ? (
            <Image source={{ uri: movie.posterUrl }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={[styles.poster, styles.posterPlaceholder]}>
              <Ionicons name="film" size={32} color="#e94560" />
            </View>
          )}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{movie.title}</Text>
            {movie.year ? <Text style={styles.year}>{movie.year}</Text> : null}
            {movie.language ? (
              <Text style={styles.meta}>
                {movie.language}{movie.format ? ` . ${movie.format}` : ''}
              </Text>
            ) : null}
            {watchlisted && (
              <View style={styles.watchlistBadge}>
                <Ionicons name="bookmark" size={12} color="#fbbf24" />
                <Text style={styles.watchlistBadgeText}>In Watchlist</Text>
              </View>
            )}
          </View>
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          {totalReviews > 0 ? (
            <>
              <View style={styles.ratingRow}>
                {renderStars(rounded, 24)}
                <AnimatedAvgRating value={avgRating} />
              </View>
              <Text style={styles.reviewCountText}>
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </Text>
            </>
          ) : (
            <AnimatedAvgRating value={null} />
          )}
        </View>

        {allReviews.length > 0 && (
          <Text style={styles.sectionTitle}>
            All Reviews ({allReviews.length})
          </Text>
        )}
      </View>
    );
  };

  const renderReviewItem = ({ item }: { item: ServerReview }) => {
    const reviewerName = item.user.displayName || 'Anonymous';
    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {reviewerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewerName}>{reviewerName}</Text>
            <View style={styles.reviewStarsRow}>
              {renderStars(item.rating, 14)}
              <Text style={styles.ratingNum}>{item.rating}/5</Text>
            </View>
          </View>
          <Text style={styles.reviewDate}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>
        {item.reviewText ? (
          <Text style={styles.reviewText}>
            {item.spoilerFlag ? '[Spoiler] ' : ''}
            {item.reviewText}
          </Text>
        ) : null}
      </View>
    );
  };

  if (loading && !movie) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="film-outline" size={48} color="#a0a0b0" />
        <Text style={styles.loadingText}>Movie not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#e94560' }}>Go back</Text>
        </Pressable>
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
      data={allReviews}
      keyExtractor={(item) => item.id}
      renderItem={renderReviewItem}
      ListEmptyComponent={
        <View style={styles.emptyReviews}>
          <Ionicons name="chatbubble-outline" size={36} color="#6b7280" />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>Be the first to review this movie!</Text>
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#e94560', fontSize: 16, marginLeft: 4 },
  watchlistBtn: { padding: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  poster: { width: 80, height: 120, borderRadius: 8, backgroundColor: '#0f3460' },
  posterPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  year: { fontSize: 15, color: '#a0a0b0', marginBottom: 2 },
  meta: { fontSize: 13, color: '#6b7280' },
  watchlistBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: '#2d2d44', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  watchlistBadgeText: { fontSize: 11, color: '#fbbf24', fontWeight: '600' },
  summaryCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 20 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  starsRow: { flexDirection: 'row' },
  avgRating: { fontSize: 32, fontWeight: 'bold', color: '#fbbf24' },
  reviewCountText: { fontSize: 14, color: '#a0a0b0' },
  noReviewsText: { fontSize: 16, color: '#6b7280', fontStyle: 'italic' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  reviewCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e94560', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  reviewerName: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  reviewStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ratingNum: { fontSize: 12, color: '#a0a0b0' },
  reviewText: { fontSize: 15, color: '#e0e0e0', lineHeight: 22, marginBottom: 4 },
  reviewDate: { fontSize: 12, color: '#6b7280' },
  emptyReviews: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#a0a0b0', marginTop: 10 },
  emptySubtext: { fontSize: 13, color: '#6b7280', marginTop: 4 },
});
