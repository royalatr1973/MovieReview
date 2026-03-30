import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { VisitCandidate, PromptState } from '@moviereview/shared';
import { qualifyVisitLocally } from '../services/visit-qualifier';

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

export const useVisitStore = create<VisitState>((set, get) => ({
  visits: [],
  activeVisit: null,
  recentVisits: [],

  loadVisits: async () => {
    // In production, load from SQLite DB
    // For now, use in-memory state
  },

  getVisit: (visitId: string) => {
    return get().visits.find((v) => v.visitId === visitId);
  },

  addVisit: (visit: LocalVisitData) => {
    set((state) => ({
      visits: [visit, ...state.visits],
      recentVisits: [visit, ...state.recentVisits].slice(0, 20),
      activeVisit: visit.exitTime ? state.activeVisit : visit,
    }));
  },

  updateVisitPromptState: (visitId: string, promptState: PromptState) => {
    set((state) => ({
      visits: state.visits.map((v) =>
        v.visitId === visitId ? { ...v, promptState } : v
      ),
    }));
  },

  simulateVisit: () => {
    const visitId = Crypto.randomUUID();
    const now = new Date();
    const entryTime = new Date(now.getTime() - 120 * 60 * 1000); // 2 hours ago
    const dwellMinutes = 120;

    const qualificationState = qualifyVisitLocally({
      dwellMinutes,
      locationConfidence: 0.85,
      recentVisitCountAtSameCinema: 0,
    });

    const visit: LocalVisitData = {
      visitId,
      userId: 'local-user',
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
    const visitId = Crypto.randomUUID();
    const now = new Date();
    const entryTime = new Date(now.getTime() - 120 * 60 * 1000); // 2 hours ago
    const dwellMinutes = 120;

    const qualificationState = qualifyVisitLocally({
      dwellMinutes,
      locationConfidence: 0.95,
      recentVisitCountAtSameCinema: 0,
    });

    const lat = coords?.latitude ?? 13.0569;
    const lon = coords?.longitude ?? 80.2571;

    const visit: LocalVisitData = {
      visitId,
      userId: 'local-user',
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
