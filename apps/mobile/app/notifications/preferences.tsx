import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  fetchNotificationPreference,
  updateNotificationPreference,
  type NotificationPreference,
} from '../../src/services/notification-preferences';

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const [pref, setPref] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotificationPreference()
      .then(setPref)
      .catch((err) => Alert.alert('Error', err.message ?? 'Failed to load preferences'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (patch: Partial<NotificationPreference>) => {
    setSaving(true);
    try {
      const next = await updateNotificationPreference(patch);
      setPref(next);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !pref) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e94560" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#ffffff" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Notification Preferences</Text>

      <View style={styles.row}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowLabel}>Review prompts</Text>
          <Text style={styles.rowHint}>Get notified to review after cinema visits</Text>
        </View>
        <Switch
          value={pref.reviewUpdateOptIn}
          onValueChange={(v) => save({ reviewUpdateOptIn: v })}
          trackColor={{ false: '#0f3460', true: '#e94560' }}
          thumbColor="#ffffff"
          disabled={saving}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery</Text>
        <View style={styles.chipRow}>
          {(['immediate', 'daily'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.chip, pref.digestMode === mode && styles.chipActive]}
              onPress={() => save({ digestMode: mode })}
              disabled={saving}
            >
              <Text style={[styles.chipText, pref.digestMode === mode && styles.chipTextActive]}>
                {mode === 'immediate' ? 'Immediate' : 'Daily Digest'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet hours start</Text>
        <View style={styles.hourRow}>
          {HOURS.map((h) => (
            <Pressable
              key={h}
              style={[styles.hourChip, pref.quietHoursStart === h && styles.chipActive]}
              onPress={() => save({ quietHoursStart: h })}
              disabled={saving}
            >
              <Text style={[styles.chipText, pref.quietHoursStart === h && styles.chipTextActive]}>
                {h}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.clearBtn} onPress={() => save({ quietHoursStart: null })} disabled={saving}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet hours end</Text>
        <View style={styles.hourRow}>
          {HOURS.map((h) => (
            <Pressable
              key={h}
              style={[styles.hourChip, pref.quietHoursEnd === h && styles.chipActive]}
              onPress={() => save({ quietHoursEnd: h })}
              disabled={saving}
            >
              <Text style={[styles.chipText, pref.quietHoursEnd === h && styles.chipTextActive]}>
                {h}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.clearBtn} onPress={() => save({ quietHoursEnd: null })} disabled={saving}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16213e' },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { color: '#ffffff', fontSize: 16, marginLeft: 4 },
  title: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 16, borderRadius: 12, marginBottom: 16 },
  rowInfo: { flex: 1 },
  rowLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  rowHint: { color: '#a0a0b0', fontSize: 13, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#a0a0b0', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  hourRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#0f3460' },
  hourChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#0f3460' },
  chipActive: { backgroundColor: '#e94560', borderColor: '#e94560' },
  chipText: { color: '#a0a0b0', fontSize: 13 },
  chipTextActive: { color: '#ffffff', fontWeight: '600' },
  clearBtn: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6 },
  clearBtnText: { color: '#e94560', fontSize: 13 },
});
