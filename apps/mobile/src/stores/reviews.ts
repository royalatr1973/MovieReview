import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Review, CreateReviewInput, Movie, SelectionSource } from '@moviereview/shared';
import { api } from '../services/api-client';

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

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  recentReviews: [],
  selectedMovie: null,
  movieCache: [],

  loadReviews: async () => {
    // In production, load from SQLite
    // Also try to fetch from API
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
      // Offline: use cached data
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
    const reviewId = uuidv4();
    const now = new Date().toISOString();

    const localReview: LocalReviewData = {
      reviewId,
      visitId: input.visitId,
      movieId: input.movieId ?? null,
      rawTitle: input.rawTitle ?? null,
      userId: 'local-user',
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

    // Save locally first (offline-first)
    set((state) => ({
      reviews: [localReview, ...state.reviews],
      recentReviews: [localReview, ...state.recentReviews].slice(0, 10),
    }));

    // Try to sync immediately
    try {
      await api.post('/reviews', input);
      set((state) => ({
        reviews: state.reviews.map((r) =>
          r.reviewId === reviewId ? { ...r, syncStatus: 'synced' } : r
        ),
      }));
    } catch {
      // Will be synced later by background task
    }
  },

  updateReview: async (reviewId, updates) => {
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.reviewId === reviewId
          ? {
              ...r,
              ...updates,
              editedAt: new Date().toISOString(),
              syncStatus: 'pending',
            }
          : r
      ),
    }));

    try {
      await api.patch(`/reviews/${reviewId}`, updates);
    } catch {
      // Will sync later
    }
  },

  deleteReview: async (reviewId) => {
    set((state) => ({
      reviews: state.reviews.filter((r) => r.reviewId !== reviewId),
      recentReviews: state.recentReviews.filter((r) => r.reviewId !== reviewId),
    }));

    try {
      await api.delete(`/reviews/${reviewId}`);
    } catch {
      // Best effort
    }
  },
}));
