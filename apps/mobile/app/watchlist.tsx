import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { CachedImage } from '../src/components/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWatchlistStore } from '../src/stores/watchlist';

export default function WatchlistScreen() {
  const router = useRouter();
  const { items, loading, load, syncFromServer, remove } = useWatchlistStore();

  useEffect(() => {
    load();
    syncFromServer();
  }, []);

  if (!loading && items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bookmark-outline" size={64} color="#a0a0b0" />
        <Text style={styles.emptyTitle}>Watchlist is empty</Text>
        <Text style={styles.emptyHint}>
          Bookmark movies from the Movies tab and they'll appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={(item) => item.movieId}
      refreshing={loading}
      onRefresh={() => syncFromServer()}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => router.push(`/movie/${item.movieId}`)}
        >
          {item.posterUrl ? (
            <CachedImage uri={item.posterUrl} style={styles.poster} />
          ) : (
            <View style={[styles.poster, styles.posterFallback]}>
              <Ionicons name="film" size={24} color="#a0a0b0" />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.meta}>
              {[item.year, item.language].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Pressable
            style={styles.removeBtn}
            onPress={() => remove(item.movieId)}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={24} color="#e94560" />
          </Pressable>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#16213e' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#16213e' },
  emptyTitle: { color: '#ffffff', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyHint: { color: '#a0a0b0', fontSize: 14, textAlign: 'center', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  poster: { width: 60, height: 90, borderRadius: 6, backgroundColor: '#1a1a2e' },
  posterFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12 },
  title: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  meta: { color: '#a0a0b0', fontSize: 13, marginTop: 4 },
  removeBtn: { padding: 4 },
});
