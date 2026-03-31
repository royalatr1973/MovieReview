import { create } from 'zustand';

interface SettingsState {
  /** Minimum dwell time in minutes to qualify a visit for review prompt */
  testDwellMinutes: number;
  /** Geofence radius in meters */
  testGeofenceRadius: number;

  setTestDwellMinutes: (minutes: number) => void;
  setTestGeofenceRadius: (radius: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  testDwellMinutes: 1,
  testGeofenceRadius: 100,

  setTestDwellMinutes: (minutes: number) => set({ testDwellMinutes: minutes }),
  setTestGeofenceRadius: (radius: number) => set({ testGeofenceRadius: radius }),
}));
