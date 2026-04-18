import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/services/api-client';

interface CinemaDetail {
  id: string;
  name: string;
  address: string | null;
  chain: string | null;
  city: string;
  averageRating: number | null;
  reviewCount: number;
}

interface CinemaReview {
  id: string;
  rating: number;
  text: string | null;
  spoiler: boolean;
  createdAt: string;
  movie: { id: string; title: string; year: number | null; posterUrl: string | null };
  user: { id: string; displayName: string | null };
}

export default function CinemaDetailScreen() {
  const router = useRouter();
  const { cinemaId } = useLocalSearchParams<{ cinemaId: string }>();
  const [cinema, setCinema] = useState<CinemaDetail | null>(null);
  const [reviews, setReviews] = useState<CinemaReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, r] = await Promise.all([
          api.get<CinemaDetail>(`/cinemas/${cinemaId}`),
          api.get<CinemaReview[]>(`/cinemas/${cinemaId}/reviews`),
        ]);
        if (!cancelled) {
          setCinema(c);
          setReviews(r);
        }
      } catch (err) {
        console.error('[CinemaDetail] fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cinemaId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e94560" />
      </View>
    );
  }

  if (!cinema) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Cinema not found</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={reviews}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.name}>{cinema.name}</Text>
          {cinema.address && <Text style={styles.meta}>{cinema.address}</Text>}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="star" size={18} color="#fbbf24" />
              <Text style={styles.statValue}>
                {cinema.averageRating ? cinema.averageRating.toFixed(1) : '—'}
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="chatbubbles" size={18} color="#a0a0b0" />
              <Text style={styles.statValue}>{cinema.reviewCount} reviews</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Recent reviews</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>No reviews yet at this cinema.</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.reviewRow}
          onPress={() => router.push(`/movie/${item.movie.id}`)}
        >
          <View style={styles.reviewHead}>
            <Text style={styles.movieTitle} numberOfLines={1}>
              {item.movie.title}
            </Text>
            <View style={styles.rating}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < item.rating ? 'star' : 'star-outline'}
                  size={14}
                  color="#fbbf24"
                />
              ))}
            </View>
          </View>
          {item.text ? (
            <Text style={styles.reviewText} numberOfLines={3}>
              {item.spoiler ? '(spoiler) ' : ''}
              {item.text}
            </Text>
          ) : null}
          <Text style={styles.reviewMeta}>
            by {item.user.displayName ?? 'Anonymous'} · {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16213e' },
  errorText: { color: '#ef4444', fontSize: 16 },
  header: { padding: 20 },
  name: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  meta: { color: '#a0a0b0', fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  sectionTitle: { color: '#a0a0b0', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginTop: 24, marginBottom: 8 },
  emptyText: { color: '#a0a0b0', textAlign: 'center', padding: 32 },
  reviewRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  movieTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  rating: { flexDirection: 'row' },
  reviewText: { color: '#d0d0e0', fontSize: 14, marginTop: 6 },
  reviewMeta: { color: '#6b7280', fontSize: 12, marginTop: 8 },
});
