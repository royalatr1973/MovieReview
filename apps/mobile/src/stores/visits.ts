import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { VisitCandidate, PromptState } from '@moviereview/shared';
import { qualifyVisitLocally } from '../services/visit-qualifier';
import { getDatabase } from '../db/database';
import {
  insertVisit,
  getRecentVisits,
  getActiveVisit,
  updateVisitPromptState as dbUpdateVisitPromptState,
  type LocalVisit,
} from '../db/visits';
import { enqueue } from '../db/sync-queue';
import { runSync } from '../services/sync';

interface LocalVisitData extends VisitCandidate {
  cinemaName?: string;
  syncStatus: string;
}

interface VisitState {
  visits: LocalVisitData[];
  activeVisit: LocalVisitData | null;
  recentVisits: LocalVisitData[];

  loadVisits: () => Promise<void>;
  getVisit: (visitId: string) => LocalVisitData | undefined;
  addVisit: (visit: LocalVisitData) => void;
  updateVisitPromptState: (visitId: string, state: PromptState) => void;
  simulateVisit: () => void;
  simulateVisitAtCurrentLocation: (coords: { latitude: number; longitude: number } | null) => void;
}

const USER_ID = 'local-user';

export const useVisitStore = create<VisitState>((set, get) => ({
  visits: [],
  activeVisit: null,
  recentVisits: [],

  loadVisits: async () => {
    const db = await getDatabase();
    if (!db) return;

    try {
      const [recent, active] = await Promise.all([
        getRecentVisits(db, USER_ID, 20),
        getActiveVisit(db, USER_ID),
      ]);

      const visits: LocalVisitData[] = recent;
      const recentVisits = recent.filter((v) => !!v.exitTime);

      set({
        visits,
        recentVisits,
        activeVisit: active ?? null,
      });
    } catch (err) {
      console.error('[VisitStore] loadVisits failed:', err);
    }
  },

  getVisit: (visitId: string) => {
    return get().visits.find((v) => v.visitId === visitId);
  },

  addVisit: (visit: LocalVisitData) => {
    // Update Zustand immediately (optimistic)
    set((state) => ({
      visits: [visit, ...state.visits],
      recentVisits: visit.exitTime
        ? [visit, ...state.recentVisits].slice(0, 20)
        : state.recentVisits,
      activeVisit: visit.exitTime ? state.activeVisit : visit,
    }));

    // Persist to SQLite + enqueue for sync
    getDatabase().then(async (db) => {
      if (!db) return;
      try {
        await insertVisit(db, visit as LocalVisit);
        await enqueue(db, visit.clientEventId, 'visit', {
          visitId: visit.visitId,
          cinemaId: visit.cinemaId,
          cinemaName: visit.cinemaName,
          entryTime: visit.entryTime,
          exitTime: visit.exitTime,
          dwellMinutes: visit.dwellMinutes,
          locationConfidence: visit.locationConfidence,
          qualificationState: visit.qualificationState,
          promptState: visit.promptState,
          clientEventId: visit.clientEventId,
        } as Record<string, unknown>);
        runSync();
      } catch (err) {
        console.error('[VisitStore] insertVisit failed:', err);
      }
    });
  },

  updateVisitPromptState: (visitId: string, promptState: PromptState) => {
    // Update Zustand immediately
    const update = (v: LocalVisitData) =>
      v.visitId === visitId ? { ...v, promptState } : v;
    set((state) => ({
      visits: state.visits.map(update),
      recentVisits: state.recentVisits.map(update),
      activeVisit:
        state.activeVisit?.visitId === visitId
          ? { ...state.activeVisit, promptState }
          : state.activeVisit,
    }));

    // Persist to SQLite in background
    getDatabase().then((db) => {
      if (!db) return;
      dbUpdateVisitPromptState(db, visitId, promptState).catch((err) =>
        console.error('[VisitStore] updateVisitPromptState failed:', err)
      );
    });
  },

  simulateVisit: () => {
    const { useSettingsStore } = require('../stores/settings');
    const testDwell = useSettingsStore.getState().testDwellMinutes;
    const visitId = Crypto.randomUUID();
    const now = new Date();
    const dwellMinutes = testDwell || 120;
    const entryTime = new Date(now.getTime() - dwellMinutes * 60 * 1000);

    const qualificationState = qualifyVisitLocally({
      dwellMinutes,
      locationConfidence: 0.85,
      recentVisitCountAtSameCinema: 0,
    });

    const visit: LocalVisitData = {
      visitId,
      userId: USER_ID,
      cinemaId: 'simulated-cinema',
      cinemaName: 'Simulated Cinema',
      entryTime: entryTime.toISOString(),
      exitTime: now.toISOString(),
      dwellMinutes,
      locationConfidence: 0.85,
      qualificationState,
      promptState: 'pending',
      clientEventId: Crypto.randomUUID(),
      createdAt: now.toISOString(),
      syncStatus: 'pending',
    };

    get().addVisit(visit);
  },

  simulateVisitAtCurrentLocation: (coords: { latitude: number; longitude: number } | null) => {
    const { useSettingsStore } = require('../stores/settings');
    const testDwell = useSettingsStore.getState().testDwellMinutes;
    const visitId = Crypto.randomUUID();
    const now = new Date();
    const dwellMinutes = testDwell || 120;
    const entryTime = new Date(now.getTime() - dwellMinutes * 60 * 1000);

    const qualificationState = qualifyVisitLocally({
      dwellMinutes,
      locationConfidence: 0.95,
      recentVisitCountAtSameCinema: 0,
    });

    const lat = coords?.latitude ?? 13.0569;
    const lon = coords?.longitude ?? 80.2571;

    const visit: LocalVisitData = {
      visitId,
      userId: USER_ID,
      cinemaId: `current-location-${lat.toFixed(4)}-${lon.toFixed(4)}`,
      cinemaName: `Cinema @ ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      entryTime: entryTime.toISOString(),
      exitTime: now.toISOString(),
      dwellMinutes,
      locationConfidence: 0.95,
      qualificationState,
      promptState: 'pending',
      clientEventId: Crypto.randomUUID(),
      createdAt: now.toISOString(),
      syncStatus: 'pending',
    };

    get().addVisit(visit);
  },
}));
