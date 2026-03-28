export type SelectionSource = 'manual' | 'autosuggest';

export interface Movie {
  id: string;
  title: string;
  year: number | null;
  language: string | null;
  format: string | null;
}

export interface MovieSelection {
  movieId: string | null;
  rawTitle: string | null;
  language: string | null;
  format: string | null;
  matchConfidence: number | null;
  selectionSource: SelectionSource;
}
