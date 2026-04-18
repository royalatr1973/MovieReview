import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@cinereview/settings';

interface PersistedState {
  testDwellMinutes: number;
  testGeofenceRadius: number;
  cinemaDetectionEnabled: boolean;
  reviewNotificationsEnabled: boolean;
}

interface SettingsState extends PersistedState {
  hydrated: boolean;

  hydrate: () => Promise<void>;
  setTestDwellMinutes: (minutes: number) => void;
  setTestGeofenceRadius: (radius: number) => void;
  setCinemaDetectionEnabled: (enabled: boolean) => void;
  setReviewNotificationsEnabled: (enabled: boolean) => void;
}

const DEFAULTS: PersistedState = {
  testDwellMinutes: 1,
  testGeofenceRadius: 100,
  cinemaDetectionEnabled: true,
  reviewNotificationsEnabled: true,
};

function persist(state: PersistedState): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((err) =>
    console.error('[SettingsStore] persist failed:', err)
  );
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        set({ ...DEFAULTS, ...parsed, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch (err) {
      console.error('[SettingsStore] hydrate failed:', err);
      set({ hydrated: true });
    }
  },

  setTestDwellMinutes: (minutes: number) => {
    set({ testDwellMinutes: minutes });
    const { testGeofenceRadius, cinemaDetectionEnabled, reviewNotificationsEnabled } = get();
    persist({ testDwellMinutes: minutes, testGeofenceRadius, cinemaDetectionEnabled, reviewNotificationsEnabled });
  },
  setTestGeofenceRadius: (radius: number) => {
    set({ testGeofenceRadius: radius });
    const { testDwellMinutes, cinemaDetectionEnabled, reviewNotificationsEnabled } = get();
    persist({ testDwellMinutes, testGeofenceRadius: radius, cinemaDetectionEnabled, reviewNotificationsEnabled });
  },
  setCinemaDetectionEnabled: (enabled: boolean) => {
    set({ cinemaDetectionEnabled: enabled });
    const { testDwellMinutes, testGeofenceRadius, reviewNotificationsEnabled } = get();
    persist({ testDwellMinutes, testGeofenceRadius, cinemaDetectionEnabled: enabled, reviewNotificationsEnabled });
  },
  setReviewNotificationsEnabled: (enabled: boolean) => {
    set({ reviewNotificationsEnabled: enabled });
    const { testDwellMinutes, testGeofenceRadius, cinemaDetectionEnabled } = get();
    persist({ testDwellMinutes, testGeofenceRadius, cinemaDetectionEnabled, reviewNotificationsEnabled: enabled });
  },
}));
