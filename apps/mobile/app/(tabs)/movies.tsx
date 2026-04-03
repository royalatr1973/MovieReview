import { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMovieStore } from '../../src/stores/movies';
import type { LocalMovie } from '../../src/db/movies';

// ── Animated rating display (Phase 4B) ────────────────────────────────────
function AnimatedRating({ value }: { value: number | null }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value && value !== null) {
      prevValue.current = value;
      // Zoom-in then settle
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.35,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value]);

  if (value === null) return <Text style={styles.noReviews}>No reviews yet</Text>;

  return (
    <Animated.Text
      style={[styles.ratingText, { transform: [{ scale: scaleAnim }] }]}
    >
      {value.toFixed(1)}
    </Animated.Text>
  );
}

// ── Movie card ─────────────────────────────────────────────────────────────
function MovieCard({
  item,
  onPress,
}: {
  item: LocalMovie;
  onPress: () => void;
}) {
  const rounded = Math.round(item.averageRating ?? 0);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.movieTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.year ? <Text style={styles.year}>{item.year}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        {item.reviewCount > 0 ? (
          <>
            {/* Star row */}
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= rounded ? 'star' : 'star-outline'}
                  size={14}
                  color="#fbbf24"
                />
              ))}
            </View>
            {/* Animated numeric rating */}
            <AnimatedRating value={item.averageRating} />
            <Text style={styles.reviewCountText}>
              ({item.reviewCount}{' '}
              {item.reviewCount === 1 ? 'review' : 'reviews'})
            </Text>
          </>
        ) : (
          <AnimatedRating value={null} />
        )}
      </View>

      {item.language ? (
        <Text style={styles.meta}>
          {item.language}
          {item.format ? ` · ${item.format}` : ''}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function MoviesScreen() {
  const router = useRouter();
  const { movies, loading, loadMovies } = useMovieStore();

  useEffect(() => {
    loadMovies();
  }, []);

  const onRefresh = useCallback(async () => {
    await loadMovies();
  }, []);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          tintColor="#e94560"
        />
      }
      data={movies}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MovieCard
          item={item}
          onPress={() => router.push(`/movie/${item.id}`)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="film-outline" size={48} color="#a0a0b0" />
          <Text style={styles.emptyText}>
            {loading ? 'Loading movies…' : 'No movies yet'}
          </Text>
          {!loading && (
            <Text style={styles.emptySubtext}>
              Movies appear here after you submit a review
            </Text>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  movieTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  year: {
    fontSize: 14,
    color: '#a0a0b0',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stars: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fbbf24',
  },
  reviewCountText: {
    fontSize: 13,
    color: '#a0a0b0',
  },
  noReviews: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  meta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#a0a0b0',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
});
