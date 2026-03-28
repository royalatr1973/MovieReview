import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReviewStore } from '../../../src/stores/reviews';
import type { Movie } from '@moviereview/shared';

export default function SelectMovieScreen() {
  const router = useRouter();
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { setSelectedMovie } = useReviewStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [isManual, setIsManual] = useState(false);

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (text.length < 2) {
        setResults([]);
        return;
      }
      // In MVP, search is from local cache or API
      // For now, results come from the store which caches movies
      try {
        const { searchMovies } = useReviewStore.getState();
        const found = await searchMovies(text);
        setResults(found);
      } catch {
        setResults([]);
      }
    },
    []
  );

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie({
      movieId: movie.id,
      rawTitle: null,
      selectionSource: 'autosuggest',
    });
    router.push(`/visit/${visitId}/rate`);
  };

  const handleManualEntry = () => {
    if (query.trim().length === 0) return;
    setSelectedMovie({
      movieId: null,
      rawTitle: query.trim(),
      selectionSource: 'manual',
    });
    router.push(`/visit/${visitId}/rate`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#a0a0b0" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a movie..."
          placeholderTextColor="#6b7280"
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>

      <FlatList
        style={styles.list}
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.movieItem}
            onPress={() => handleSelectMovie(item)}
          >
            <Ionicons name="film" size={20} color="#e94560" />
            <View style={styles.movieInfo}>
              <Text style={styles.movieTitle}>{item.title}</Text>
              <Text style={styles.movieMeta}>
                {[item.year, item.language, item.format]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </Pressable>
        )}
        ListHeaderComponent={
          query.length >= 2 ? (
            <Pressable style={styles.manualEntry} onPress={handleManualEntry}>
              <Ionicons name="create-outline" size={20} color="#fbbf24" />
              <Text style={styles.manualText}>
                Use "{query}" as movie title
              </Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          query.length >= 2 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No movies found</Text>
              <Text style={styles.emptySubtext}>
                You can type a title and use it directly
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color="#a0a0b0" />
              <Text style={styles.emptyText}>Type to search for a movie</Text>
              <Text style={styles.emptySubtext}>
                Or enter a title manually
              </Text>
            </View>
          )
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
  movieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  movieInfo: {
    flex: 1,
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  movieMeta: {
    fontSize: 13,
    color: '#a0a0b0',
    marginTop: 2,
  },
  manualEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderStyle: 'dashed',
  },
  manualText: {
    color: '#fbbf24',
    fontSize: 15,
    flex: 1,
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
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
