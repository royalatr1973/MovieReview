import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReviewStore } from '../../src/stores/reviews';
import { useVisitStore } from '../../src/stores/visits';
import { useWatchlistStore } from '../../src/stores/watchlist';
import { useAuthStore } from '../../src/stores/auth';
import { getDatabase } from '../../src/db/database';
import { getPendingItems, type SyncQueueItem } from '../../src/db/sync-queue';
import { runSync } from '../../src/services/sync';

export default function ProfileScreen() {
  const router = useRouter();
  const { reviews, loadReviews } = useReviewStore();
  const { visits, loadVisits } = useVisitStore();
  const { items: watchlist, load: loadWatchlist } = useWatchlistStore();
  const { user } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    await Promise.all([loadReviews(), loadVisits(), loadWatchlist()]);
    const db = await getDatabase();
    if (db) {
      const pending = await getPendingItems(db, 99);
      setPendingSync(pending.length);
      setPendingItems(pending);
    }
  }, []);

  useEffect(() => { loadAll(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  // Stats
  const totalReviews = reviews.length;
  const totalVisits = visits.length;
  const avgRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  // Rating distribution
  const ratingDist = [1, 2, 3, 4, 5].map(
    (r) => reviews.filter((rev) => rev.rating === r).length
  );
  const maxDist = Math.max(...ratingDist, 1);

  // Favorite cinema (most visits)
  const cinemaVisits: Record<string, { name: string; count: number }> = {};
  visits.forEach((v) => {
    const name = v.cinemaName || v.cinemaId;
    if (!cinemaVisits[name]) cinemaVisits[name] = { name, count: 0 };
    cinemaVisits[name].count++;
  });
  const favCinema = Object.values(cinemaVisits).sort((a, b) => b.count - a.count)[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
    >
      {/* User header */}
      <View style={styles.userHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.displayName || user?.email || 'Movie Lover'}</Text>
        {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalReviews}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalVisits}</Text>
          <Text style={styles.statLabel}>Visits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{avgRating > 0 ? avgRating.toFixed(1) : '-'}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{watchlist.length}</Text>
          <Text style={styles.statLabel}>Watchlist</Text>
        </View>
      </View>

      {/* Sync status */}
      <View style={styles.syncCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Ionicons name={pendingSync > 0 ? "cloud-upload-outline" : "cloud-done-outline"} size={20} color={pendingSync > 0 ? "#fbbf24" : "#4ade80"} />
          <Text style={[styles.syncText, pendingSync === 0 && { color: '#4ade80' }]}>
            {pendingSync > 0
              ? `${pendingSync} item${pendingSync !== 1 ? 's' : ''} waiting to sync`
              : 'All synced'}
          </Text>
        </View>

          {/* Breakdown - only when items pending */}
          {pendingSync > 0 && (
            <View style={{ marginBottom: 10, paddingLeft: 4 }}>
              <Text style={{ color: '#a0a0b0', fontSize: 12 }}>
                📋 {pendingItems.filter(i => i.entityType === 'visit').length} visit(s), {pendingItems.filter(i => i.entityType === 'review').length} review(s)
              </Text>
              {pendingItems.filter(i => i.retryCount > 0).length > 0 && (
                <Text style={{ color: '#f87171', fontSize: 12, marginTop: 2 }}>
                  ⚠️ {pendingItems.filter(i => i.retryCount > 0).length} item(s) have failed before (retries: {Math.max(...pendingItems.map(i => i.retryCount))})
                </Text>
              )}
            </View>
          )}

          {syncResult && (
            <Text style={{ color: syncResult.startsWith('✅') ? '#4ade80' : '#f87171', fontSize: 12, marginBottom: 8 }}>
              {syncResult}
            </Text>
          )}

          {/* Always show Sync Now button */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              style={[styles.syncBtn, syncing && { opacity: 0.5 }]}
              disabled={syncing}
              onPress={async () => {
                setSyncing(true);
                setSyncResult(null);
                try {
                  await runSync();
                  await loadAll();
                  const db = await getDatabase();
                  const remaining = db ? (await getPendingItems(db, 99)).length : 0;
                  if (remaining === 0) {
                    setSyncResult('✅ All items synced successfully!');
                  } else {
                    setSyncResult(`⚠️ ${remaining} item(s) still pending — server may be rejecting them`);
                  }
                } catch (err: any) {
                  setSyncResult(`❌ Sync error: ${err.message}`);
                } finally {
                  setSyncing(false);
                }
              }}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Sync Now</Text>
              )}
            </Pressable>

            {pendingSync > 0 && (
              <Pressable
                style={styles.clearBtn}
                onPress={() => {
                  Alert.alert(
                    'Clear Sync Queue',
                    'This will remove all pending items from the queue. Reviews/visits are still saved locally but won\'t upload to server. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear All',
                        style: 'destructive',
                        onPress: async () => {
                          const db = await getDatabase();
                          if (db) {
                            await db.runAsync('DELETE FROM sync_queue WHERE sync_status IN (\'pending\', \'failed\')');
                            await loadAll();
                            setSyncResult('🗑️ Queue cleared');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={{ color: '#f87171', fontWeight: '600', fontSize: 13 }}>Clear Queue</Text>
              </Pressable>
            )}
          </View>
      </View>

      {/* Rating distribution */}
      {totalReviews > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rating Distribution</Text>
          <View style={styles.distContainer}>
            {[5, 4, 3, 2, 1].map((star) => (
              <View key={star} style={styles.distRow}>
                <Text style={styles.distLabel}>{star}</Text>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <View style={styles.distBarBg}>
                  <View
                    style={[
                      styles.distBarFill,
                      { width: `${(ratingDist[star - 1] / maxDist) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.distCount}>{ratingDist[star - 1]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Favorite cinema */}
      {favCinema && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Cinema</Text>
          <View style={styles.favCard}>
            <Ionicons name="location" size={24} color="#e94560" />
            <View style={{ flex: 1 }}>
              <Text style={styles.favName}>{favCinema.name}</Text>
              <Text style={styles.favCount}>{favCinema.count} visits</Text>
            </View>
          </View>
        </View>
      )}

      {/* Watchlist preview */}
      {watchlist.length > 0 && (
        <View style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => router.push('/watchlist')}
          >
            <Text style={styles.sectionTitle}>Watchlist ({watchlist.length})</Text>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
          {watchlist.slice(0, 5).map((item) => (
            <Pressable
              key={item.movieId}
              style={styles.watchlistItem}
              onPress={() => router.push(`/movie/${item.movieId}`)}
            >
              <Ionicons name="bookmark" size={16} color="#fbbf24" />
              <Text style={styles.watchlistTitle} numberOfLines={1}>{item.title}</Text>
              {item.year && <Text style={styles.watchlistYear}>{item.year}</Text>}
              <Ionicons name="chevron-forward" size={16} color="#6b7280" />
            </Pressable>
          ))}
          {watchlist.length > 5 && (
            <Pressable onPress={() => router.push('/watchlist')}>
              <Text style={styles.moreText}>+{watchlist.length - 5} more</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e' },
  content: { padding: 16 },
  userHeader: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#e94560', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  userName: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  userEmail: { fontSize: 14, color: '#a0a0b0', marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  statLabel: { fontSize: 11, color: '#a0a0b0', marginTop: 4 },
  syncCard: { backgroundColor: '#2d2d44', borderRadius: 12, padding: 14, marginBottom: 16 },
  syncText: { color: '#fbbf24', fontSize: 14, fontWeight: '500', flex: 1 },
  syncBtn: { backgroundColor: '#e94560', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  clearBtn: { backgroundColor: 'transparent', borderRadius: 8, borderWidth: 1, borderColor: '#f87171', paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  distContainer: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  distLabel: { width: 14, fontSize: 13, color: '#a0a0b0', textAlign: 'right' },
  distBarBg: { flex: 1, height: 10, backgroundColor: '#0f3460', borderRadius: 5, overflow: 'hidden' },
  distBarFill: { height: '100%', backgroundColor: '#e94560', borderRadius: 5 },
  distCount: { width: 24, fontSize: 12, color: '#a0a0b0', textAlign: 'right' },
  favCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16 },
  favName: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  favCount: { fontSize: 13, color: '#a0a0b0', marginTop: 2 },
  watchlistItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, marginBottom: 6 },
  watchlistTitle: { flex: 1, fontSize: 15, color: '#ffffff', fontWeight: '500' },
  watchlistYear: { fontSize: 13, color: '#a0a0b0' },
  moreText: { textAlign: 'center', color: '#6b7280', fontSize: 13, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll: { color: '#e94560', fontSize: 13, fontWeight: '600' },
});
