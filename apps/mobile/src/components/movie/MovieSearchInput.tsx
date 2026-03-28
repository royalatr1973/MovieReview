import { useState, useCallback } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MovieSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function MovieSearchInput({
  value,
  onChangeText,
  placeholder = 'Search for a movie...',
}: MovieSearchInputProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#a0a0b0" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6b7280"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Ionicons
          name="close-circle"
          size={20}
          color="#6b7280"
          onPress={() => onChangeText('')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
});
