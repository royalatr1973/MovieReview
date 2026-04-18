import { create } from 'zustand';
import { getDatabase } from '../db/database';
import {
  addToWatchlist as dbAdd,
  removeFromWatchlist as dbRemove,
  getWatchlist as dbGet,
  isInWatchlist as dbCheck,
  type WatchlistItem,
} from '../db/watchlist';
import { api } from '../services/api-client';

interface WatchlistState {
  items: WatchlistItem[];
  loading: boolean;

  load: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  add: (item: Omit<WatchlistItem, 'addedAt'>) => Promise<void>;
  remove: (movieId: string) => Promise<void>;
  isWatchlisted: (movieId: string) => boolean;
}

interface ServerWatchlistRow {
  movieId: string;
  createdAt: string;
  movie: {
    id: string;
    title: string;
    year: number | null;
    language: string | null;
    posterUrl: string | null;
  };
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

  syncFromServer: async () => {
    try {
      const rows = await api.get<ServerWatchlistRow[]>('/watchlist');
      const db = await getDatabase();
      const localItems: WatchlistItem[] = rows.map((r) => ({
        movieId: r.movieId,
        title: r.movie.title,
        year: r.movie.year,
        language: r.movie.language,
        posterUrl: r.movie.posterUrl,
        addedAt: r.createdAt,
      }));
      if (db) {
        // Mirror server into local cache. Last-write-wins: server is source of truth.
        await db.runAsync('DELETE FROM watchlist');
        for (const item of localItems) {
          await dbAdd(db, {
            movieId: item.movieId,
            title: item.title,
            year: item.year,
            language: item.language,
            posterUrl: item.posterUrl,
          });
        }
      }
      set({ items: localItems });
    } catch (err) {
      console.log('[Watchlist] syncFromServer skipped:', (err as Error).message ?? err);
    }
  },

  add: async (item) => {
    // Optimistic
    const newItem: WatchlistItem = { ...item, addedAt: new Date().toISOString() };
    set((s) => ({ items: [newItem, ...s.items] }));

    const db = await getDatabase();
    if (db) {
      try {
        await dbAdd(db, item);
      } catch (err) {
        console.error('[Watchlist] local add failed:', err);
      }
    }
    // Fire-and-forget server sync
    api.post('/watchlist', { movieId: item.movieId }).catch((err) =>
      console.log('[Watchlist] server add failed (will retry on next sync):', err.message ?? err)
    );
  },

  remove: async (movieId) => {
    set((s) => ({ items: s.items.filter((i) => i.movieId !== movieId) }));
    const db = await getDatabase();
    if (db) {
      try {
        await dbRemove(db, movieId);
      } catch (err) {
        console.error('[Watchlist] local remove failed:', err);
      }
    }
    api.delete(`/watchlist/${movieId}`).catch((err) =>
      console.log('[Watchlist] server remove failed:', err.message ?? err)
    );
  },

  isWatchlisted: (movieId) => {
    return get().items.some((i) => i.movieId === movieId);
  },
}));
