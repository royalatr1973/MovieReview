import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReviewStore } from '../../src/stores/reviews';
import { ReviewCard } from '../../src/components/review/ReviewCard';

export default function HistoryScreen() {
  const router = useRouter();
  const { reviews, loadReviews } = useReviewStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  }, [loadReviews]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />
      }
      data={reviews}
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
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>
            Your movie reviews will appear here
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
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
