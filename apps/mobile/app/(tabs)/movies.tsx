import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api-client';

interface MovieWithStats {
  id: string;
  title: string;
  year: number | null;
  language: string | null;
  format: string | null;
  averageRating: number | null;
  reviewCount: number;
}

// Sample data for offline/demo use
const SAMPLE_MOVIES: MovieWithStats[] = [
  { id: 'dune-part-three', title: 'Dune: Part Three', year: 2026, language: 'English', format: 'IMAX', averageRating: 4.5, reviewCount: 12 },
  { id: 'the-batman-part-ii', title: 'The Batman Part II', year: 2026, language: 'English', format: '2D', averageRating: 4.2, reviewCount: 8 },
  { id: 'avengers-secret-wars', title: 'Avengers: Secret Wars', year: 2027, language: 'English', format: '3D', averageRating: 3.8, reviewCount: 25 },
  { id: 'mission-impossible-8', title: 'Mission: Impossible 8', year: 2025, language: 'English', format: 'IMAX', averageRating: 4.6, reviewCount: 18 },
  { id: 'spider-man-brand-new-day', title: 'Spider-Man: Brand New Day', year: 2026, language: 'English', format: '3D', averageRating: 4.0, reviewCount: 15 },
  { id: 'oppenheimer-2', title: 'Oppenheimer 2', year: 2026, language: 'English', format: '2D', averageRating: 4.7, reviewCount: 6 },
  { id: 'parasite-2', title: 'Parasite 2', year: 2026, language: 'Korean', format: '2D', averageRating: 4.4, reviewCount: 9 },
  { id: 'the-french-connection-remake', title: 'The French Connection Remake', year: 2026, language: 'English', format: '2D', averageRating: 3.5, reviewCount: 4 },
  { id: 'interstellar-2', title: 'Interstellar 2', year: 2026, language: 'English', format: 'IMAX', averageRating: 4.8, reviewCount: 22 },
  { id: 'blade-runner-2099', title: 'Blade Runner 2099', year: 2026, language: 'English', format: '2D', averageRating: 4.3, reviewCount: 7 },
];

export default function MoviesScreen() {
  const router = useRouter();
  const [movies, setMovies] = useState<MovieWithStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMovies = useCallback(async () => {
    try {
      const response = await api.get<{ data: MovieWithStats[] }>('/movies');
      setMovies(response.data);
    } catch {
      // Offline or server down - use sample data
      setMovies(SAMPLE_MOVIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMovies();
    setRefreshing(false);
  }, []);

  const renderStars = (rating: number | null) => {
    if (rating === null) return null;
    const rounded = Math.round(rating);
    return (
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
    );
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />
      }
      data={movies}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push(`/movie/${item.id}`)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.movieTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.year && <Text style={styles.year}>{item.year}</Text>}
          </View>

          <View style={styles.statsRow}>
            {item.reviewCount > 0 ? (
              <>
                {renderStars(item.averageRating)}
                <Text style={styles.ratingText}>
                  {item.averageRating?.toFixed(1)}
                </Text>
                <Text style={styles.reviewCountText}>
                  ({item.reviewCount} {item.reviewCount === 1 ? 'review' : 'reviews'})
                </Text>
              </>
            ) : (
              <Text style={styles.noReviews}>No reviews yet</Text>
            )}
          </View>

          {item.language && (
            <Text style={styles.meta}>
              {item.language}{item.format ? ` · ${item.format}` : ''}
            </Text>
          )}
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="film-outline" size={48} color="#a0a0b0" />
          <Text style={styles.emptyText}>
            {loading ? 'Loading movies...' : 'No movies found'}
          </Text>
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
    marginBottom: 4,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    marginRight: 6,
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
});
