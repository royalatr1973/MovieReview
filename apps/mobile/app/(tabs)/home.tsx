import { useEffect, useCallback } from 'react';
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
import { useVisitStore } from '../../src/stores/visits';
import { useReviewStore } from '../../src/stores/reviews';
import { VisitCard } from '../../src/components/visit/VisitCard';
import { ReviewCard } from '../../src/components/review/ReviewCard';

export default function HomeScreen() {
  const router = useRouter();
  const { activeVisit, recentVisits, loadVisits } = useVisitStore();
  const { recentReviews, loadReviews } = useReviewStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVisits();
    loadReviews();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadVisits(), loadReviews()]);
    setRefreshing(false);
  }, []);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />
      }
      ListHeaderComponent={
        <>
          {activeVisit && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Visit</Text>
              <VisitCard
                visit={activeVisit}
                onPress={() =>
                  router.push(`/visit/${activeVisit.visitId}/confirm`)
                }
              />
            </View>
          )}

          {recentVisits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Visits</Text>
              {recentVisits.slice(0, 3).map((visit) => {
                const canReview =
                  visit.promptState === 'pending' || visit.promptState === 'completed';
                return (
                  <VisitCard
                    key={visit.visitId}
                    visit={visit}
                    onPress={canReview ? () => router.push(`/visit/${visit.visitId}/confirm`) : undefined}
                  />
                );
              })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
          </View>
        </>
      }
      data={recentReviews.slice(0, 10)}
      keyExtractor={(item) => item.reviewId}
      renderItem={({ item }) => (
        <ReviewCard
          review={item}
          onPress={() => router.push(`/review/${item.reviewId}`)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="film-outline" size={48} color="#a0a0b0" />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>
            Visit a cinema and we'll prompt you to review!
          </Text>
        </View>
      }
    />
  );
}

import { useState } from 'react';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
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
    textAlign: 'center',
  },
});
