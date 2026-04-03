/**
 * TMDB (The Movie Database) API service.
 *
 * Set your API key in apps/mobile/.env:
 *   EXPO_PUBLIC_TMDB_API_KEY=your_key_here
 *
 * Get a free API key at: https://www.themoviedb.org/settings/api
 */

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';

export interface TmdbMovie {
  /** Local stable ID: "tmdb-{tmdb_id}" */
  id: string;
  tmdbId: number;
  title: string;
  year: number | null;
  language: string | null;
  posterUrl: string | null;
  /** Always null from TMDB — format is determined at the cinema */
  format: null;
}

let _lastQuery = '';
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Search TMDB for movies matching `query`.
 * Returns [] if the API key is not configured or the request fails.
 * Results are filtered to those with a release year (active/real movies).
 */
export async function searchTMDB(query: string): Promise<TmdbMovie[]> {
  if (!TMDB_API_KEY || query.trim().length < 2) return [];

  try {
    const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      query
    )}&language=en-US&region=IN&include_adult=false`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const results: TmdbMovie[] = (data.results ?? [])
      .slice(0, 10)
      .map((r: any) => ({
        id: `tmdb-${r.id}`,
        tmdbId: r.id,
        title: r.title,
        year: r.release_date ? parseInt(r.release_date.slice(0, 4), 10) : null,
        language: mapLanguage(r.original_language),
        posterUrl: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
        format: null,
      }));

    return results;
  } catch {
    return [];
  }
}

/** True if a TMDB API key is configured in the environment. */
export function isTmdbConfigured(): boolean {
  return !!TMDB_API_KEY;
}

const LANGUAGE_MAP: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  te: 'Telugu',
  hi: 'Hindi',
  ml: 'Malayalam',
  kn: 'Kannada',
  bn: 'Bengali',
  mr: 'Marathi',
  ko: 'Korean',
  ja: 'Japanese',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  zh: 'Chinese',
};

function mapLanguage(code: string | null): string | null {
  if (!code) return null;
  return LANGUAGE_MAP[code] ?? code.toUpperCase();
}
