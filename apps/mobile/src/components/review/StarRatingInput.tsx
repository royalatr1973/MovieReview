import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
}

export function StarRatingInput({
  value,
  onChange,
  size = 40,
}: StarRatingInputProps) {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          hitSlop={8}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color="#fbbf24"
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
});
