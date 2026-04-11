import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReviewStore } from '../../src/stores/reviews';
import { ReviewCard } from '../../src/components/review/ReviewCard';

type SortMode = 'recent' | 'rating_high' | 'rating_low';

export default function HistoryScreen() {
  const router = useRouter();
  const { reviews, loadReviews } = useReviewStore();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('recent');

  useEffect(() => {
    loadReviews();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  }, [loadReviews]);

  const filteredAndSorted = useMemo(() => {
    let list = reviews;

    // Filter by search (movie title or review text)
    if (search.length >= 2) {
      const lower = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.rawTitle ?? '').toLowerCase().includes(lower) ||
          (r.movieId ?? '').toLowerCase().includes(lower) ||
          (r.reviewText ?? '').toLowerCase().includes(lower)
      );
    }

    // Sort
    const sorted = [...list];
    switch (sortBy) {
      case 'recent':
        sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'rating_high':
        sorted.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'rating_low':
        sorted.sort((a, b) => a.rating - b.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    return sorted;
  }, [reviews, search, sortBy]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />
      }
      ListHeaderComponent={
        <>
          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#a0a0b0" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reviews..."
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
            <Pressable
              style={[styles.sortPill, sortBy === 'recent' && styles.sortPillActive]}
              onPress={() => setSortBy('recent')}
            >
              <Text style={[styles.sortPillText, sortBy === 'recent' && styles.sortPillTextActive]}>
                Most Recent
              </Text>
            </Pressable>
            <Pressable
              style={[styles.sortPill, sortBy === 'rating_high' && styles.sortPillActive]}
              onPress={() => setSortBy('rating_high')}
            >
              <Text style={[styles.sortPillText, sortBy === 'rating_high' && styles.sortPillTextActive]}>
                Highest Rated
              </Text>
            </Pressable>
            <Pressable
              style={[styles.sortPill, sortBy === 'rating_low' && styles.sortPillActive]}
              onPress={() => setSortBy('rating_low')}
            >
              <Text style={[styles.sortPillText, sortBy === 'rating_low' && styles.sortPillTextActive]}>
                Lowest Rated
              </Text>
            </Pressable>
          </View>

          {/* Count */}
          <Text style={styles.resultCount}>
            {filteredAndSorted.length} review{filteredAndSorted.length !== 1 ? 's' : ''}
          </Text>
        </>
      }
      data={filteredAndSorted}
      keyExtractor={(item) => item.reviewId}
      renderItem={({ item }) => (
        <ReviewCard
          review={item}
          onPress={() => router.push(`/review/${item.reviewId}`)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={48} color="#a0a0b0" />
          <Text style={styles.emptyText}>
            {search ? `No reviews matching "${search}"` : 'No reviews yet'}
          </Text>
          {!search && (
            <Text style={styles.emptySubtext}>
              Your movie reviews will appear here
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
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
