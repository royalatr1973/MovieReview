import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Animated,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMovieStore } from '../../src/stores/movies';
import type { LocalMovie } from '../../src/db/movies';

type SortMode = 'rating' | 'reviews' | 'title' | 'recent';

// ── Animated rating display (Phase 4B) ────────────────────────────────────
function AnimatedRating({ value }: { value: number | null }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value && value !== null) {
      prevValue.current = value;
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
  rank,
  onPress,
}: {
  item: LocalMovie;
  rank: number;
  onPress: () => void;
}) {
  const rounded = Math.round(item.averageRating ?? 0);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{rank}</Text>
        </View>
        <Text style={styles.movieTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.year ? <Text style={styles.year}>{item.year}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        {item.reviewCount > 0 ? (
          <>
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
          {item.format ? ` . ${item.format}` : ''}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ── Sort pill ──────────────────────────────────────────────────────────────
function SortPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.sortPill, active && styles.sortPillActive]}
      onPress={onPress}
    >
      <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function MoviesScreen() {
  const router = useRouter();
  const { movies, loading, loadMovies } = useMovieStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('rating');
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);

  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    for (const m of movies) {
      if (m.language && m.language.trim()) set.add(m.language.trim());
    }
    return Array.from(set).sort();
  }, [movies]);

  useEffect(() => {
    loadMovies();
  }, []);

  const onRefresh = useCallback(async () => {
    await loadMovies();
  }, [loadMovies]);

  const filteredAndSorted = useMemo(() => {
    let list = movies;

    // Filter by language chip
    if (languageFilter) {
      list = list.filter((m) => (m.language ?? '').trim() === languageFilter);
    }

    // Filter by search
    if (search.length >= 2) {
      const lower = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(lower) ||
          (m.language ?? '').toLowerCase().includes(lower)
      );
    }

    // Sort
    const sorted = [...list];
    switch (sortBy) {
      case 'rating':
        sorted.sort(
          (a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0) || b.reviewCount - a.reviewCount
        );
        break;
      case 'reviews':
        sorted.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'recent':
        sorted.sort(
          (a, b) => new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime()
        );
        break;
    }
    return sorted;
  }, [movies, search, sortBy, languageFilter]);

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
      ListHeaderComponent={
        <>
          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#a0a0b0" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search movies..."
              placeholderTextColor="#6b7280"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#6b7280" />
              </Pressable>
            )}
          </View>

          {/* Sort pills */}
          <View style={styles.sortRow}>
            <SortPill label="Top Rated" active={sortBy === 'rating'} onPress={() => setSortBy('rating')} />
            <SortPill label="Most Reviewed" active={sortBy === 'reviews'} onPress={() => setSortBy('reviews')} />
            <SortPill label="A-Z" active={sortBy === 'title'} onPress={() => setSortBy('title')} />
            <SortPill label="Recent" active={sortBy === 'recent'} onPress={() => setSortBy('recent')} />
          </View>

          {/* Language filter chips */}
          {availableLanguages.length > 0 && (
            <View style={styles.sortRow}>
              <SortPill
                label="All"
                active={languageFilter === null}
                onPress={() => setLanguageFilter(null)}
              />
              {availableLanguages.map((lang) => (
                <SortPill
                  key={lang}
                  label={lang}
                  active={languageFilter === lang}
                  onPress={() => setLanguageFilter(lang)}
                />
              ))}
            </View>
          )}

          {/* Result count */}
          <Text style={styles.resultCount}>
            {filteredAndSorted.length} movie{filteredAndSorted.length !== 1 ? 's' : ''}
          </Text>
        </>
      }
      data={filteredAndSorted}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <MovieCard
          item={item}
          rank={index + 1}
          onPress={() => router.push(`/movie/${item.id}`)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="film-outline" size={48} color="#a0a0b0" />
          <Text style={styles.emptyText}>
            {loading
              ? 'Loading movies...'
              : search
              ? `No movies matching "${search}"`
              : 'No movies yet'}
          </Text>
          {!loading && !search && (
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  sortPillActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  sortPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a0a0b0',
  },
  sortPillTextActive: {
    color: '#ffffff',
  },
  resultCount: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
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
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  rankBadge: {
    backgroundColor: '#0f3460',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e94560',
  },
  movieTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
});
