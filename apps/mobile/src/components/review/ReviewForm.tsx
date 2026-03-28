import { useState } from 'react';
import { View, TextInput, StyleSheet, Switch, Text } from 'react-native';
import { StarRatingInput } from './StarRatingInput';
import { Button } from '../ui/Button';

interface ReviewFormProps {
  onSubmit: (data: {
    rating: number;
    reviewText: string;
    spoilerFlag: boolean;
  }) => void;
  loading?: boolean;
  initialRating?: number;
  initialText?: string;
  initialSpoiler?: boolean;
}

export function ReviewForm({
  onSubmit,
  loading = false,
  initialRating = 0,
  initialText = '',
  initialSpoiler = false,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [reviewText, setReviewText] = useState(initialText);
  const [spoilerFlag, setSpoilerFlag] = useState(initialSpoiler);

  return (
    <View style={styles.container}>
      <View style={styles.ratingSection}>
        <Text style={styles.label}>Your Rating</Text>
        <StarRatingInput value={rating} onChange={setRating} />
      </View>

      <View style={styles.textSection}>
        <Text style={styles.label}>Review (optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="What did you think?"
          placeholderTextColor="#6b7280"
          value={reviewText}
          onChangeText={setReviewText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.spoilerRow}>
        <Text style={styles.spoilerLabel}>Contains spoilers</Text>
        <Switch
          value={spoilerFlag}
          onValueChange={setSpoilerFlag}
          trackColor={{ false: '#0f3460', true: '#e94560' }}
          thumbColor="#ffffff"
        />
      </View>

      <Button
        title={loading ? 'Submitting...' : 'Submit Review'}
        onPress={() => onSubmit({ rating, reviewText, spoilerFlag })}
        disabled={rating === 0 || loading}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  ratingSection: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#a0a0b0',
    marginBottom: 8,
  },
  textSection: {},
  textInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  spoilerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  spoilerLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
});
