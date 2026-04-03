import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReviewStore } from '../../../src/stores/reviews';
import { useMovieStore } from '../../../src/stores/movies';
import { searchTMDB, isTmdbConfigured, type TmdbMovie } from '../../../src/services/tmdb';
import type { LocalMovie } from '../../../src/db/movies';

type ResultItem =
  | { kind: 'local'; movie: LocalMovie }
  | { kind: 'tmdb'; movie: TmdbMovie }
  | { kind: 'manual'; title: string };

export default function SelectMovieScreen() {
  const router = useRouter();
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { setSelectedMovie } = useReviewStore();
  const { searchLocal, cacheTmdbMovie } = useMovieStore();

  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState<LocalMovie[]>([]);
  const [tmdbResults, setTmdbResults] = useState<TmdbMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (text: string) => {
      if (text.length < 3) {
        setLocalResults([]);
        setTmdbResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      const [local, tmdb] = await Promise.all([
        searchLocal(text),
        searchTMDB(text),
      ]);

      // Deduplicate: hide TMDB results whose title is already in local suggestions
      const localTitles = new Set(local.map((m) => m.title.toLowerCase()));
      const dedupedTmdb = tmdb.filter(
        (t) => !localTitles.has(t.title.toLowerCase())
      );

      setLocalResults(local);
      setTmdbResults(dedupedTmdb);
      setSearching(false);
    },
    [searchLocal]
  );

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(text), 350);
    },
    [runSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Selection handlers ──────────────────────────────────────────────────

  const handleSelectLocal = (movie: LocalMovie) => {
    setSelectedMovie({
      movieId: movie.id,
      rawTitle: null,
      selectionSource: 'autosuggest',
    });
    router.push(`/visit/${visitId}/rate`);
  };

  const handleSelectTmdb = async (movie: TmdbMovie) => {
    // Cache TMDB result in local DB so future users see it as a suggestion
    const movieId = await cacheTmdbMovie(movie);
    setSelectedMovie({
      movieId,
      rawTitle: null,
      selectionSource: 'autosuggest',
    });
    router.push(`/visit/${visitId}/rate`);
  };

  const handleManualEntry = () => {
    if (query.trim().length === 0) return;
    // reviewsStore.submitReview will call ensureUserMovie automatically
    setSelectedMovie({
      movieId: null,
      rawTitle: query.trim(),
      selectionSource: 'manual',
    });
    router.push(`/visit/${visitId}/rate`);
  };

  // ── Render helpers ──────────────────────────────────────────────────────

  const renderLocalItem = (movie: LocalMovie) => (
    <Pressable
      key={`local-${movie.id}`}
      style={styles.movieItem}
      onPress={() => handleSelectLocal(movie)}
    >
      <View style={styles.posterPlaceholder}>
        <Ionicons name="film" size={20} color="#e94560" />
      </View>
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle}>{movie.title}</Text>
        <View style={styles.metaRow}>
          {movie.year ? (
            <Text style={styles.movieMeta}>{movie.year}</Text>
          ) : null}
          {movie.language ? (
            <Text style={styles.movieMeta}>{movie.language}</Text>
          ) : null}
          {movie.reviewCount > 0 ? (
            <View style={styles.reviewBadge}>
              <Ionicons name="star" size={10} color="#fbbf24" />
              <Text style={styles.reviewBadgeText}>
                {movie.averageRating?.toFixed(1)} · {movie.reviewCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#6b7280" />
    </Pressable>
  );

  const renderTmdbItem = (movie: TmdbMovie) => (
    <Pressable
      key={`tmdb-${movie.id}`}
      style={styles.movieItem}
      onPress={() => handleSelectTmdb(movie)}
    >
      {movie.posterUrl ? (
        <Image
          source={{ uri: movie.posterUrl }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.posterPlaceholder}>
          <Ionicons name="film-outline" size={20} color="#6b7280" />
        </View>
      )}
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle}>{movie.title}</Text>
        <View style={styles.metaRow}>
          {movie.year ? (
            <Text style={styles.movieMeta}>{movie.year}</Text>
          ) : null}
          {movie.language ? (
            <Text style={styles.movieMeta}>{movie.language}</Text>
          ) : null}
          <View style={styles.tmdbBadge}>
            <Text style={styles.tmdbBadgeText}>TMDB</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#6b7280" />
    </Pressable>
  );

  const hasResults = localResults.length > 0 || tmdbResults.length > 0;
  const showManualOption = query.trim().length >= 2;
  const showTmdbHint = query.length >= 3 && !isTmdbConfigured() && localResults.length === 0;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#a0a0b0" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a movie…"
          placeholderTextColor="#6b7280"
          value={query}
          onChangeText={handleQueryChange}
          autoFocus
          returnKeyType="search"
        />
        {searching && (
          <ActivityIndicator size="small" color="#e94560" style={{ marginLeft: 8 }} />
        )}
      </View>

      <FlatList
        style={styles.list}
        data={[]}
        renderItem={null}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {/* Manual / "use as title" row */}
            {showManualOption && (
              <Pressable style={styles.manualEntry} onPress={handleManualEntry}>
                <Ionicons name="create-outline" size={20} color="#fbbf24" />
                <Text style={styles.manualText} numberOfLines={1}>
                  Use "{query.trim()}" as movie title
                </Text>
              </Pressable>
            )}

            {/* Local suggestions (review_count ≥ 3 or TMDB-sourced) */}
            {localResults.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Suggestions</Text>
                {localResults.map(renderLocalItem)}
              </>
            )}

            {/* TMDB results */}
            {tmdbResults.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>
                  {isTmdbConfigured() ? 'From TMDB' : 'Results'}
                </Text>
                {tmdbResults.map(renderTmdbItem)}
              </>
            )}

            {/* TMDB not configured hint */}
            {showTmdbHint && (
              <View style={styles.hint}>
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text style={styles.hintText}>
                  Add EXPO_PUBLIC_TMDB_API_KEY to .env for richer movie search
                </Text>
              </View>
            )}

            {/* Empty state */}
            {!searching && query.length >= 3 && !hasResults && (
              <View style={styles.empty}>
                <Ionicons name="film-outline" size={40} color="#a0a0b0" />
                <Text style={styles.emptyText}>No movies found</Text>
                <Text style={styles.emptySubtext}>
                  Use the option above to enter the title manually
                </Text>
              </View>
            )}

            {/* Idle state */}
            {query.length < 3 && (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={40} color="#a0a0b0" />
                <Text style={styles.emptyText}>Type to search</Text>
                <Text style={styles.emptySubtext}>
                  Search by movie name — or enter a title manually
                </Text>
              </View>
            )}
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  movieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  poster: {
    width: 46,
    height: 68,
    borderRadius: 6,
    backgroundColor: '#0f3460',
  },
  posterPlaceholder: {
    width: 46,
    height: 68,
    borderRadius: 6,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieInfo: {
    flex: 1,
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  movieMeta: {
    fontSize: 12,
    color: '#a0a0b0',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#2d2d44',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reviewBadgeText: {
    fontSize: 11,
    color: '#fbbf24',
    fontWeight: '600',
  },
  tmdbBadge: {
    backgroundColor: '#01b4e4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tmdbBadgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  manualEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a2e',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderStyle: 'dashed',
  },
  manualText: {
    color: '#fbbf24',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
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
