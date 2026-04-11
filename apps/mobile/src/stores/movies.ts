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
import { api } from '../services/api-client';

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

    // Primary: load from local SQLite
    const db = await getDatabase();
    if (db) {
      try {
        const movies = await getAllMoviesWithStats(db, 100);
        if (movies.length > 0) {
          set({ movies, loading: false });
        }
      } catch (err) {
        console.error('[MovieStore] loadMovies from SQLite failed:', err);
      }
    }

    // Secondary: fetch from server and merge into local DB
    try {
      const response = await api.get<{ data: any[] }>('/movies');
      const serverMovies = response.data;
      if (serverMovies && serverMovies.length > 0 && db) {
        for (const m of serverMovies) {
          await upsertMovie(db, {
            id: m.id,
            title: m.title,
            year: m.year ?? null,
            language: m.language ?? null,
            format: m.format ?? null,
            tmdbId: m.tmdbId ?? null,
            posterUrl: m.posterUrl ?? null,
            userSubmitted: m.userSubmitted ?? false,
            reviewCount: m.reviewCount ?? m._count?.reviews ?? 0,
            averageRating: m.averageRating ?? null,
          });
        }
        // Reload from SQLite to get merged data with stats
        const merged = await getAllMoviesWithStats(db, 100);
        set({ movies: merged, loading: false });
        return;
      }
    } catch {
      // Offline — local data already loaded
    }

    set({ loading: false });
  },

  getMovieById: (id: string) => {
    return get().movies.find((m) => m.id === id);
  },

  searchLocal: async (query: string) => {
    const db = await getDatabase();
    const localResults: LocalMovie[] = [];

    // Search local SQLite first
    if (db) {
      try {
        const results = await searchMoviesLocal(db, query, 20);
        localResults.push(...results);
      } catch {
        // continue to server
      }
    }

    // Also search server for movies other users have reviewed
    try {
      const response = await api.get<{ data: any[] }>(
        `/movies/search?q=${encodeURIComponent(query)}`
      );
      if (response.data && response.data.length > 0 && db) {
        for (const m of response.data) {
          // Cache server results locally (including rating data)
          await upsertMovie(db, {
            id: m.id,
            title: m.title,
            year: m.year ?? null,
            language: m.language ?? null,
            format: m.format ?? null,
            tmdbId: m.tmdbId ?? null,
            posterUrl: m.posterUrl ?? null,
            userSubmitted: m.userSubmitted ?? false,
            reviewCount: (m as any).reviewCount ?? (m as any)._count?.reviews ?? 0,
            averageRating: (m as any).averageRating ?? null,
          });
        }
        // Re-search locally to get merged results with proper stats
        const merged = await searchMoviesLocal(db, query, 20);
        return merged;
      }
    } catch {
      // Offline — use local results
    }

    return localResults;
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
    if (!movieId) return;

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
