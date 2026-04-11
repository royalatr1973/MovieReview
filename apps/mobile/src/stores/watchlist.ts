import { create } from 'zustand';
import { getDatabase } from '../db/database';
import {
  addToWatchlist as dbAdd,
  removeFromWatchlist as dbRemove,
  getWatchlist as dbGet,
  isInWatchlist as dbCheck,
  type WatchlistItem,
} from '../db/watchlist';

interface WatchlistState {
  items: WatchlistItem[];
  loading: boolean;

  load: () => Promise<void>;
  add: (item: Omit<WatchlistItem, 'addedAt'>) => Promise<void>;
  remove: (movieId: string) => Promise<void>;
  isWatchlisted: (movieId: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const db = await getDatabase();
    if (!db) { set({ loading: false }); return; }
    try {
      const items = await dbGet(db);
      set({ items, loading: false });
    } catch (err) {
      console.error('[Watchlist] load failed:', err);
      set({ loading: false });
    }
  },

  add: async (item) => {
    // Optimistic
    const newItem: WatchlistItem = { ...item, addedAt: new Date().toISOString() };
    set((s) => ({ items: [newItem, ...s.items] }));

    const db = await getDatabase();
    if (!db) return;
    try {
      await dbAdd(db, item);
    } catch (err) {
      console.error('[Watchlist] add failed:', err);
    }
  },

  remove: async (movieId) => {
    set((s) => ({ items: s.items.filter((i) => i.movieId !== movieId) }));
    const db = await getDatabase();
    if (!db) return;
    try {
      await dbRemove(db, movieId);
    } catch (err) {
      console.error('[Watchlist] remove failed:', err);
    }
  },

  isWatchlisted: (movieId) => {
    return get().items.some((i) => i.movieId === movieId);
  },
}));
