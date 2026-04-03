export type SelectionSource = 'manual' | 'autosuggest';

export interface Movie {
  id: string;
  title: string;
  year: number | null;
  language: string | null;
  format: string | null;
  tmdbId?: number | null;
  posterUrl?: string | null;
  userSubmitted?: boolean;
  reviewCount?: number;
  averageRating?: number | null;
}

export interface MovieSelection {
  movieId: string | null;
  rawTitle: string | null;
  language: string | null;
  format: string | null;
  matchConfidence: number | null;
  selectionSource: SelectionSource;
}
