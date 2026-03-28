import type { SelectionSource } from './movie';

export interface Review {
  reviewId: string;
  visitId: string;
  movieId: string | null;
  rawTitle: string | null;
  userId: string;
  rating: number;
  reviewText: string | null;
  spoilerFlag: boolean;
  matchConfidence: number | null;
  selectionSource: SelectionSource;
  clientEventId: string;
  createdAt: string;
  editedAt: string | null;
}

export interface CreateReviewInput {
  visitId: string;
  movieId?: string;
  rawTitle?: string;
  rating: number;
  reviewText?: string;
  spoilerFlag?: boolean;
  selectionSource: SelectionSource;
  clientEventId: string;
}

export interface UpdateReviewInput {
  rating?: number;
  reviewText?: string;
  spoilerFlag?: boolean;
}
