import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUALIFICATION_LABELS } from '@moviereview/shared';
import type { VisitCandidate } from '@moviereview/shared';

interface VisitCardProps {
  visit: VisitCandidate & { cinemaName?: string };
  onPress?: () => void;
}

export function VisitCard({ visit, onPress }: VisitCardProps) {
  const isActive = !visit.exitTime;
  const qualLabel = QUALIFICATION_LABELS[visit.qualificationState] || visit.qualificationState;

  const badgeColor = {
    pending: '#6b7280',
    discarded: '#6b7280',
    soft_confirm: '#fbbf24',
    full_review: '#4ade80',
    employee_check: '#f97316',
  }[visit.qualificationState] || '#6b7280';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.row}>
        <Ionicons
          name={isActive ? 'location' : 'location-outline'}
          size={24}
          color="#e94560"
        />
        <View style={styles.info}>
          <Text style={styles.cinemaName}>
            {visit.cinemaName || visit.cinemaId}
          </Text>
          <Text style={styles.time}>
            {isActive
              ? `Since ${new Date(visit.entryTime).toLocaleTimeString()}`
              : `${visit.dwellMinutes} min · ${new Date(visit.entryTime).toLocaleDateString()}`}
          </Text>
        </View>
        <View style={[styles.badge, { borderColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>
            {qualLabel}
          </Text>
        </View>
      </View>

      {visit.promptState === 'pending' &&
        (visit.qualificationState === 'soft_confirm' ||
          visit.qualificationState === 'full_review') && (
          <View style={styles.action}>
            <Text style={styles.actionText}>Tap to review</Text>
            <Ionicons name="chevron-forward" size={16} color="#e94560" />
          </View>
        )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  cinemaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  time: {
    fontSize: 13,
    color: '#a0a0b0',
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  actionText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '600',
  },
});
