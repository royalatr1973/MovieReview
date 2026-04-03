import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { Review, CreateReviewInput, Movie, SelectionSource } from '@moviereview/shared';
import { api } from '../services/api-client';
import { getDatabase } from '../db/database';
import {
  insertReview,
  getUserReviews,
  updateReview as dbUpdateReview,
  deleteReview as dbDeleteReview,
  type LocalReview,
} from '../db/reviews';
import { enqueue } from '../db/sync-queue';
import { useMovieStore } from './movies';
import { runSync } from '../services/sync';

interface SelectedMovie {
  movieId: string | null;
  rawTitle: string | null;
  selectionSource: SelectionSource;
}

interface LocalReviewData extends Review {
  syncStatus: string;
}

interface ReviewState {
  reviews: LocalReviewData[];
  recentReviews: LocalReviewData[];
  selectedMovie: SelectedMovie | null;
  movieCache: Movie[];

  loadReviews: () => Promise<void>;
  getReview: (reviewId: string) => LocalReviewData | undefined;
  setSelectedMovie: (movie: SelectedMovie) => void;
  searchMovies: (query: string) => Promise<Movie[]>;
  submitReview: (input: CreateReviewInput) => Promise<void>;
  updateReview: (reviewId: string, updates: { rating?: number; reviewText?: string }) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
}

const USER_ID = 'local-user';

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  recentReviews: [],
  selectedMovie: null,
  movieCache: [],

  loadReviews: async () => {
    // Primary: load from local SQLite (works offline, survives restart)
    const db = await getDatabase();
    if (db) {
      try {
        const rows = await getUserReviews(db, USER_ID, 50);
        const reviews: LocalReviewData[] = rows;
        set({ reviews, recentReviews: reviews.slice(0, 10) });
      } catch (err) {
        console.error('[ReviewStore] loadReviews from SQLite failed:', err);
      }
    }

    // Secondary: try server sync in background (update cache if available)
    try {
      const response = await api.get<{ data: any[] }>('/reviews?limit=50');
      const reviews: LocalReviewData[] = response.data.map((r) => ({
        reviewId: r.id,
        visitId: r.visitId,
        movieId: r.movieId,
        rawTitle: r.rawTitle,
        userId: r.userId,
        rating: r.rating,
        reviewText: r.reviewText,
        spoilerFlag: r.spoilerFlag,
        matchConfidence: r.matchConfidence,
        selectionSource: r.selectionSource,
        clientEventId: r.clientEventId,
        createdAt: r.createdAt,
        editedAt: r.editedAt,
        syncStatus: 'synced',
      }));
      set({ reviews, recentReviews: reviews.slice(0, 10) });
    } catch {
      // Offline: SQLite data is already loaded above
    }
  },

  getReview: (reviewId: string) => {
    return get().reviews.find((r) => r.reviewId === reviewId);
  },

  setSelectedMovie: (movie: SelectedMovie) => {
    set({ selectedMovie: movie });
  },

  searchMovies: async (query: string) => {
    try {
      const response = await api.get<{ data: Movie[] }>(
        `/movies/search?q=${encodeURIComponent(query)}`
      );
      set({ movieCache: response.data });
      return response.data;
    } catch {
      // Fallback: search local cache
      const { movieCache } = get();
      return movieCache.filter((m) =>
        m.title.toLowerCase().includes(query.toLowerCase())
      );
    }
  },

  submitReview: async (input: CreateReviewInput) => {
    const reviewId = Crypto.randomUUID();
    const now = new Date().toISOString();

    // For manual entries: ensure a local movie record exists before saving the review
    let resolvedMovieId = input.movieId ?? null;
    if (!resolvedMovieId && input.rawTitle) {
      try {
        resolvedMovieId = await useMovieStore.getState().ensureUserMovie(input.rawTitle);
      } catch {
        // Non-fatal — rawTitle is still stored on the review
      }
    }

    const localReview: LocalReviewData = {
      reviewId,
      visitId: input.visitId,
      movieId: resolvedMovieId,
      rawTitle: input.rawTitle ?? null,
      userId: USER_ID,
      rating: input.rating,
      reviewText: input.reviewText ?? null,
      spoilerFlag: input.spoilerFlag ?? false,
      matchConfidence: null,
      selectionSource: input.selectionSource,
      clientEventId: input.clientEventId,
      createdAt: now,
      editedAt: null,
      syncStatus: 'pending',
    };

    // Optimistic UI update immediately
    set((state) => ({
      reviews: [localReview, ...state.reviews],
      recentReviews: [localReview, ...state.recentReviews].slice(0, 10),
    }));

    // Update movie stats (review count + average rating) — Phase 4A
    if (resolvedMovieId) {
      useMovieStore.getState().recordReview(resolvedMovieId, input.rating);
    }

    // Persist to SQLite + enqueue for sync
    const finalInput = { ...input, movieId: resolvedMovieId ?? undefined };
    const db = await getDatabase();
    if (db) {
      try {
        await insertReview(db, { ...finalInput, reviewId, userId: USER_ID });
        await enqueue(db, input.clientEventId, 'review', {
          ...finalInput,
          reviewId,
          userId: USER_ID,
        } as Record<string, unknown>);
      } catch (err) {
        console.error('[ReviewStore] submitReview SQLite failed:', err);
      }
    }

    // Fire background sync (uploads the queued item via /sync/batch)
    runSync();
  },

  updateReview: async (reviewId, updates) => {
    const editedAt = new Date().toISOString();

    // Optimistic update
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.reviewId === reviewId
          ? { ...r, ...updates, editedAt, syncStatus: 'pending' }
          : r
      ),
      recentReviews: state.recentReviews.map((r) =>
        r.reviewId === reviewId
          ? { ...r, ...updates, editedAt, syncStatus: 'pending' }
          : r
      ),
    }));

    // Persist to SQLite
    const db = await getDatabase();
    if (db) {
      try {
        await dbUpdateReview(db, reviewId, updates);
      } catch (err) {
        console.error('[ReviewStore] updateReview SQLite failed:', err);
      }
    }

    try {
      await api.patch(`/reviews/${reviewId}`, updates);
    } catch {
      // Will sync later
    }
  },

  deleteReview: async (reviewId) => {
    // Optimistic removal
    set((state) => ({
      reviews: state.reviews.filter((r) => r.reviewId !== reviewId),
      recentReviews: state.recentReviews.filter((r) => r.reviewId !== reviewId),
    }));

    // Remove from SQLite
    const db = await getDatabase();
    if (db) {
      try {
        await dbDeleteReview(db, reviewId);
      } catch (err) {
        console.error('[ReviewStore] deleteReview SQLite failed:', err);
      }
    }

    try {
      await api.delete(`/reviews/${reviewId}`);
    } catch {
      // Best effort
    }
  },
}));
