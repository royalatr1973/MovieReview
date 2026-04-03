import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '../db/database';
import {
  upsertMovie,
  recordMovieReview,
  getMovieById as dbGetMovieById,
  searchMoviesLocal,
  getAllMoviesWithStats,
  getOrCreateUserMovie,
  type LocalMovie,
} from '../db/movies';
import type { TmdbMovie } from '../services/tmdb';

interface MovieState {
  /** All movies loaded into memory (for the Movies tab) */
  movies: LocalMovie[];
  /** True while the initial load is running */
  loading: boolean;

  loadMovies: () => Promise<void>;
  getMovieById: (id: string) => LocalMovie | undefined;

  /**
   * Search local DB for suggestions matching query.
   * Only returns movies with review_count >= 3 or user_submitted = false
   * (i.e. sourced from TMDB/admin). Phase 3C threshold enforcement.
   */
  searchLocal: (query: string) => Promise<LocalMovie[]>;

  /**
   * Cache a TMDB result in local DB so it shows up in future searches.
   * Returns the local movie ID ("tmdb-{tmdbId}").
   */
  cacheTmdbMovie: (tmdb: TmdbMovie) => Promise<string>;

  /**
   * Get or create a user-submitted movie entry.
   * Returns the local movie ID.
   */
  ensureUserMovie: (title: string) => Promise<string>;

  /**
   * Called after a review is submitted.
   * Increments review_count, recalculates average_rating in SQLite + Zustand.
   */
  recordReview: (movieId: string, rating: number) => Promise<void>;
}

export const useMovieStore = create<MovieState>((set, get) => ({
  movies: [],
  loading: false,

  loadMovies: async () => {
    set({ loading: true });
    const db = await getDatabase();
    if (!db) {
      set({ loading: false });
      return;
    }
    try {
      const movies = await getAllMoviesWithStats(db, 100);
      set({ movies, loading: false });
    } catch (err) {
      console.error('[MovieStore] loadMovies failed:', err);
      set({ loading: false });
    }
  },

  getMovieById: (id: string) => {
    return get().movies.find((m) => m.id === id);
  },

  searchLocal: async (query: string) => {
    const db = await getDatabase();
    if (!db) return [];
    try {
      return await searchMoviesLocal(db, query, 20);
    } catch {
      return [];
    }
  },

  cacheTmdbMovie: async (tmdb: TmdbMovie) => {
    const db = await getDatabase();
    if (db) {
      try {
        await upsertMovie(db, {
          id: tmdb.id,
          title: tmdb.title,
          year: tmdb.year,
          language: tmdb.language,
          format: null,
          tmdbId: tmdb.tmdbId,
          posterUrl: tmdb.posterUrl,
          userSubmitted: false,
        });
      } catch (err) {
        console.error('[MovieStore] cacheTmdbMovie failed:', err);
      }
    }
    return tmdb.id;
  },

  ensureUserMovie: async (title: string) => {
    const db = await getDatabase();
    const newId = `user-${Crypto.randomUUID()}`;
    if (db) {
      try {
        const id = await getOrCreateUserMovie(db, title, newId);
        return id;
      } catch (err) {
        console.error('[MovieStore] ensureUserMovie failed:', err);
      }
    }
    return newId;
  },

  recordReview: async (movieId: string, rating: number) => {
    // Optimistic update in Zustand
    set((state) => ({
      movies: state.movies.map((m) => {
        if (m.id !== movieId) return m;
        const newCount = m.reviewCount + 1;
        const newAvg =
          m.averageRating === null
            ? rating
            : Math.round(((m.averageRating * m.reviewCount + rating) / newCount) * 100) / 100;
        return { ...m, reviewCount: newCount, averageRating: newAvg };
      }),
    }));

    // Persist in SQLite
    const db = await getDatabase();
    if (db) {
      try {
        await recordMovieReview(db, movieId, rating);
      } catch (err) {
        console.error('[MovieStore] recordReview failed:', err);
      }
    }
  },
}));
