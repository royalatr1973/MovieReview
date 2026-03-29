import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api-client';

interface MovieDetail {
  id: string;
  title: string;
  year: number | null;
  language: string | null;
  format: string | null;
  averageRating: number | null;
  reviewCount: number;
}

interface MovieReview {
  id: string;
  rating: number;
  reviewText: string | null;
  spoilerFlag: boolean;
  createdAt: string;
  user: { displayName: string | null };
}

// Sample reviews for demo/offline use
const SAMPLE_MOVIES_DATA: Record<string, { movie: MovieDetail; reviews: MovieReview[] }> = {
  'dune-part-three': {
    movie: { id: 'dune-part-three', title: 'Dune: Part Three', year: 2026, language: 'English', format: 'IMAX', averageRating: 4.5, reviewCount: 12 },
    reviews: [
      { id: '1', rating: 5, reviewText: 'Absolutely stunning visuals. Villeneuve has outdone himself. The desert sequences in IMAX are breathtaking.', spoilerFlag: false, createdAt: '2026-03-15T10:00:00Z', user: { displayName: 'Sarah M.' } },
      { id: '2', rating: 5, reviewText: 'A masterpiece. The conclusion we deserved. Timothée Chalamet delivers his best performance yet.', spoilerFlag: false, createdAt: '2026-03-14T18:30:00Z', user: { displayName: 'James K.' } },
      { id: '3', rating: 4, reviewText: 'Great movie but felt a bit long in the middle. The final act more than makes up for it though.', spoilerFlag: false, createdAt: '2026-03-13T20:15:00Z', user: { displayName: 'Priya R.' } },
      { id: '4', rating: 4, reviewText: 'The soundtrack is incredible. Hans Zimmer at his finest. Must watch in IMAX.', spoilerFlag: false, createdAt: '2026-03-12T14:00:00Z', user: { displayName: 'Mike T.' } },
      { id: '5', rating: 5, reviewText: null, spoilerFlag: false, createdAt: '2026-03-11T09:45:00Z', user: { displayName: 'Anna L.' } },
    ],
  },
  'the-batman-part-ii': {
    movie: { id: 'the-batman-part-ii', title: 'The Batman Part II', year: 2026, language: 'English', format: '2D', averageRating: 4.2, reviewCount: 8 },
    reviews: [
      { id: '6', rating: 5, reviewText: 'Dark, gritty, and absolutely gripping. Robert Pattinson owns this role. Best Batman adaptation ever.', spoilerFlag: false, createdAt: '2026-03-20T21:00:00Z', user: { displayName: 'Chris W.' } },
      { id: '7', rating: 4, reviewText: 'The villain was terrifying. Really well done noir detective story.', spoilerFlag: false, createdAt: '2026-03-19T19:30:00Z', user: { displayName: 'Diana P.' } },
      { id: '8', rating: 3, reviewText: 'Good but not as fresh as the first one. Still worth watching.', spoilerFlag: false, createdAt: '2026-03-18T16:00:00Z', user: { displayName: 'Tom H.' } },
    ],
  },
  'avengers-secret-wars': {
    movie: { id: 'avengers-secret-wars', title: 'Avengers: Secret Wars', year: 2027, language: 'English', format: '3D', averageRating: 3.8, reviewCount: 25 },
    reviews: [
      { id: '9', rating: 4, reviewText: 'Fan service done right. So many great cameos and callbacks. The multiverse concept finally pays off.', spoilerFlag: false, createdAt: '2026-03-25T22:00:00Z', user: { displayName: 'Kevin F.' } },
      { id: '10', rating: 3, reviewText: 'Entertaining but overstuffed. Too many characters, not enough depth for any of them.', spoilerFlag: false, createdAt: '2026-03-24T20:00:00Z', user: { displayName: 'Lisa M.' } },
      { id: '11', rating: 5, reviewText: 'This is what we have been waiting for! Epic in every way possible!', spoilerFlag: false, createdAt: '2026-03-23T17:30:00Z', user: { displayName: 'Ryan S.' } },
      { id: '12', rating: 3, reviewText: 'The CGI was a bit much. Story was okay.', spoilerFlag: false, createdAt: '2026-03-22T15:00:00Z', user: { displayName: 'Emily C.' } },
    ],
  },
  'mission-impossible-8': {
    movie: { id: 'mission-impossible-8', title: 'Mission: Impossible 8', year: 2025, language: 'English', format: 'IMAX', averageRating: 4.6, reviewCount: 18 },
    reviews: [
      { id: '13', rating: 5, reviewText: 'Tom Cruise is insane. The stunts in this are absolutely unbelievable. Best action movie ever made.', spoilerFlag: false, createdAt: '2026-02-10T21:00:00Z', user: { displayName: 'Jack R.' } },
      { id: '14', rating: 5, reviewText: 'Non-stop adrenaline from start to finish. The train sequence had me on the edge of my seat.', spoilerFlag: false, createdAt: '2026-02-09T19:00:00Z', user: { displayName: 'Sophia B.' } },
      { id: '15', rating: 4, reviewText: 'Great action but the plot was a bit convoluted. Still a must-see in theaters.', spoilerFlag: false, createdAt: '2026-02-08T14:30:00Z', user: { displayName: 'David L.' } },
    ],
  },
  'spider-man-brand-new-day': {
    movie: { id: 'spider-man-brand-new-day', title: 'Spider-Man: Brand New Day', year: 2026, language: 'English', format: '3D', averageRating: 4.0, reviewCount: 15 },
    reviews: [
      { id: '16', rating: 4, reviewText: 'Fresh take on Spider-Man. Loved the new direction they took the character in.', spoilerFlag: false, createdAt: '2026-03-05T20:00:00Z', user: { displayName: 'Peter J.' } },
      { id: '17', rating: 4, reviewText: 'Fun and heartfelt. The humor lands perfectly.', spoilerFlag: false, createdAt: '2026-03-04T18:00:00Z', user: { displayName: 'MJ W.' } },
      { id: '18', rating: 3, reviewText: 'Decent but feels formulaic at this point. Need something new.', spoilerFlag: false, createdAt: '2026-03-03T16:00:00Z', user: { displayName: 'Harry O.' } },
    ],
  },
  'oppenheimer-2': {
    movie: { id: 'oppenheimer-2', title: 'Oppenheimer 2', year: 2026, language: 'English', format: '2D', averageRating: 4.7, reviewCount: 6 },
    reviews: [
      { id: '19', rating: 5, reviewText: 'Nolan does it again. A deeply moving exploration of the aftermath. Cillian Murphy deserves every award.', spoilerFlag: false, createdAt: '2026-03-28T20:00:00Z', user: { displayName: 'Robert D.' } },
      { id: '20', rating: 5, reviewText: 'Intense and thought-provoking. The courtroom scenes are riveting.', spoilerFlag: false, createdAt: '2026-03-27T18:00:00Z', user: { displayName: 'Nina S.' } },
      { id: '21', rating: 4, reviewText: 'Very good movie. Not quite as impactful as the first but still excellent filmmaking.', spoilerFlag: false, createdAt: '2026-03-26T15:00:00Z', user: { displayName: 'Alex T.' } },
    ],
  },
  'parasite-2': {
    movie: { id: 'parasite-2', title: 'Parasite 2', year: 2026, language: 'Korean', format: '2D', averageRating: 4.4, reviewCount: 9 },
    reviews: [
      { id: '22', rating: 5, reviewText: 'Bong Joon-ho is a genius. This sequel adds new layers to the class commentary. Absolutely brilliant.', spoilerFlag: false, createdAt: '2026-03-20T20:00:00Z', user: { displayName: 'Min-jun K.' } },
      { id: '23', rating: 4, reviewText: 'Clever and surprising. Different enough from the original to justify its existence.', spoilerFlag: false, createdAt: '2026-03-19T18:00:00Z', user: { displayName: 'Rachel G.' } },
      { id: '24', rating: 4, reviewText: 'The twists kept coming. Great performances all around.', spoilerFlag: false, createdAt: '2026-03-18T16:00:00Z', user: { displayName: 'Jun P.' } },
    ],
  },
  'the-french-connection-remake': {
    movie: { id: 'the-french-connection-remake', title: 'The French Connection Remake', year: 2026, language: 'English', format: '2D', averageRating: 3.5, reviewCount: 4 },
    reviews: [
      { id: '25', rating: 4, reviewText: 'Surprisingly good remake. The car chase scene is updated perfectly for modern audiences.', spoilerFlag: false, createdAt: '2026-03-15T20:00:00Z', user: { displayName: 'Frank H.' } },
      { id: '26', rating: 3, reviewText: 'Decent but unnecessary. The original is still better.', spoilerFlag: false, createdAt: '2026-03-14T18:00:00Z', user: { displayName: 'Tony M.' } },
    ],
  },
  'interstellar-2': {
    movie: { id: 'interstellar-2', title: 'Interstellar 2', year: 2026, language: 'English', format: 'IMAX', averageRating: 4.8, reviewCount: 22 },
    reviews: [
      { id: '27', rating: 5, reviewText: 'Emotionally devastating and scientifically fascinating. Cried three times. An absolute triumph.', spoilerFlag: false, createdAt: '2026-03-28T22:00:00Z', user: { displayName: 'Cooper M.' } },
      { id: '28', rating: 5, reviewText: 'Even better than the first. The space visuals in IMAX are jaw-dropping. A once in a lifetime experience.', spoilerFlag: false, createdAt: '2026-03-27T20:00:00Z', user: { displayName: 'Amelia B.' } },
      { id: '29', rating: 5, reviewText: 'Nolan has created the greatest sci-fi sequel ever. The story is beautiful.', spoilerFlag: false, createdAt: '2026-03-26T18:00:00Z', user: { displayName: 'Romilly K.' } },
      { id: '30', rating: 4, reviewText: 'Incredible but the time dilation stuff got confusing. Still amazing though.', spoilerFlag: false, createdAt: '2026-03-25T16:00:00Z', user: { displayName: 'Doyle W.' } },
    ],
  },
  'blade-runner-2099': {
    movie: { id: 'blade-runner-2099', title: 'Blade Runner 2099', year: 2026, language: 'English', format: '2D', averageRating: 4.3, reviewCount: 7 },
    reviews: [
      { id: '31', rating: 5, reviewText: 'Visually stunning. The neo-noir aesthetic is perfected here. A worthy successor to the franchise.', spoilerFlag: false, createdAt: '2026-03-22T21:00:00Z', user: { displayName: 'Roy B.' } },
      { id: '32', rating: 4, reviewText: 'Slow burn but rewarding. The philosophical questions about AI identity are timely.', spoilerFlag: false, createdAt: '2026-03-21T19:00:00Z', user: { displayName: 'Deckard S.' } },
      { id: '33', rating: 4, reviewText: 'Beautiful cinematography. Every frame is a painting.', spoilerFlag: false, createdAt: '2026-03-20T17:00:00Z', user: { displayName: 'Rachael T.' } },
    ],
  },
};

export default function MovieDetailScreen() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [reviews, setReviews] = useState<MovieReview[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [movieRes, reviewsRes] = await Promise.all([
        api.get<MovieDetail>(`/movies/${movieId}`),
        api.get<{ data: MovieReview[] }>(`/movies/${movieId}/reviews`),
      ]);
      setMovie(movieRes);
      setReviews(reviewsRes.data);
    } catch {
      // Offline - use sample data
      const sample = SAMPLE_MOVIES_DATA[movieId];
      if (sample) {
        setMovie(sample.movie);
        setReviews(sample.reviews);
      }
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const renderStars = (rating: number, size: number = 16) => (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color="#fbbf24"
        />
      ))}
    </View>
  );

  const renderHeader = () => {
    if (!movie) return null;
    return (
      <View style={styles.header}>
        <Text style={styles.title}>{movie.title}</Text>
        {movie.year && <Text style={styles.year}>{movie.year}</Text>}
        {movie.language && (
          <Text style={styles.meta}>
            {movie.language}{movie.format ? ` · ${movie.format}` : ''}
          </Text>
        )}

        <View style={styles.summaryCard}>
          {movie.averageRating !== null ? (
            <>
              <View style={styles.ratingRow}>
                {renderStars(Math.round(movie.averageRating), 24)}
                <Text style={styles.avgRating}>{movie.averageRating.toFixed(1)}</Text>
              </View>
              <Text style={styles.reviewCountText}>
                {movie.reviewCount} {movie.reviewCount === 1 ? 'review' : 'reviews'}
              </Text>
            </>
          ) : (
            <Text style={styles.noReviewsText}>No reviews yet</Text>
          )}
        </View>

        {reviews.length > 0 && (
          <Text style={styles.sectionTitle}>All Reviews</Text>
        )}
      </View>
    );
  };

  const renderReviewItem = ({ item }: { item: MovieReview }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {renderStars(item.rating)}
        <Text style={styles.reviewerName}>
          {item.user.displayName || 'Anonymous'}
        </Text>
      </View>
      {item.reviewText && (
        <Text style={styles.reviewText}>
          {item.spoilerFlag ? '[Spoiler] ' : ''}
          {item.reviewText}
        </Text>
      )}
      <Text style={styles.reviewDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />
      }
      ListHeaderComponent={renderHeader}
      data={reviews}
      keyExtractor={(item) => item.id}
      renderItem={renderReviewItem}
      ListEmptyComponent={
        movie ? (
          <View style={styles.emptyReviews}>
            <Ionicons name="chatbubble-outline" size={36} color="#6b7280" />
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySubtext}>
              Be the first to review this movie!
            </Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  loadingText: {
    color: '#a0a0b0',
    fontSize: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  year: {
    fontSize: 16,
    color: '#a0a0b0',
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avgRating: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginLeft: 10,
  },
  reviewCountText: {
    fontSize: 14,
    color: '#a0a0b0',
  },
  noReviewsText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 10,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a0a0b0',
  },
  reviewText: {
    fontSize: 15,
    color: '#e0e0e0',
    lineHeight: 22,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#a0a0b0',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
