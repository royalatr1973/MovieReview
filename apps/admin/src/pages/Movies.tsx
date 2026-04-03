import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Movie {
  id: string;
  title: string;
  year: number | null;
  language: string | null;
  tmdbId: number | null;
  posterUrl: string | null;
  userSubmitted: boolean;
  _count: { reviews: number };
  avgRating: number | null;
}

export default function Movies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [tmdbInput, setTmdbInput] = useState('');

  useEffect(() => {
    loadMovies();
  }, []);

  async function loadMovies() {
    setLoading(true);
    try {
      const data = await api<Movie[]>('/admin/movies');
      setMovies(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  }

  async function handleMerge() {
    if (!mergeSource || !mergeTarget) return;
    if (!confirm(`Merge all reviews from "${movies.find(m => m.id === mergeSource)?.title}" into "${movies.find(m => m.id === mergeTarget)?.title}"?`)) return;
    try {
      await api('/admin/movies/merge', {
        method: 'POST',
        body: JSON.stringify({ sourceId: mergeSource, targetId: mergeTarget }),
      });
      setMergeSource(null);
      setMergeTarget('');
      loadMovies();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Merge failed');
    }
  }

  async function handleLinkTmdb(movieId: string) {
    const tmdbId = parseInt(tmdbInput);
    if (!tmdbId) return;
    try {
      await api(`/admin/movies/${movieId}/link-tmdb`, {
        method: 'POST',
        body: JSON.stringify({ tmdbId }),
      });
      setLinkingId(null);
      setTmdbInput('');
      loadMovies();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Link failed');
    }
  }

  const filtered = movies.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Movies ({movies.length})</h1>
        <input
          placeholder="Search movies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Merge controls */}
      {mergeSource && (
        <div style={mergeCard}>
          <span>Merge into: </span>
          <select
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select target movie...</option>
            {movies
              .filter((m) => m.id !== mergeSource)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m._count.reviews} reviews)
                </option>
              ))}
          </select>
          <button onClick={handleMerge} disabled={!mergeTarget} style={mergeBtn}>
            Merge
          </button>
          <button onClick={() => setMergeSource(null)} style={cancelBtn}>
            Cancel
          </button>
        </div>
      )}

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Poster</th>
            <th style={thStyle}>Title</th>
            <th style={thStyle}>Year</th>
            <th style={thStyle}>Language</th>
            <th style={thStyle}>TMDB ID</th>
            <th style={thStyle}>Reviews</th>
            <th style={thStyle}>Avg Rating</th>
            <th style={thStyle}>Source</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((m) => (
            <tr key={m.id}>
              <td style={tdStyle}>
                {m.posterUrl ? (
                  <img src={m.posterUrl} alt="" style={{ width: 32, height: 48, objectFit: 'cover', borderRadius: 3 }} />
                ) : (
                  <div style={{ width: 32, height: 48, backgroundColor: '#e5e7eb', borderRadius: 3 }} />
                )}
              </td>
              <td style={tdStyle}>{m.title}</td>
              <td style={tdStyle}>{m.year || '-'}</td>
              <td style={tdStyle}>{m.language || '-'}</td>
              <td style={tdStyle}>
                {linkingId === m.id ? (
                  <span style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="number"
                      placeholder="TMDB ID"
                      value={tmdbInput}
                      onChange={(e) => setTmdbInput(e.target.value)}
                      style={{ ...searchInput, width: 90, padding: '3px 6px' }}
                    />
                    <button onClick={() => handleLinkTmdb(m.id)} style={editBtn}>Save</button>
                    <button onClick={() => setLinkingId(null)} style={editBtn}>X</button>
                  </span>
                ) : (
                  m.tmdbId || '-'
                )}
              </td>
              <td style={tdStyle}>{m._count.reviews}</td>
              <td style={tdStyle}>
                {m.avgRating != null ? m.avgRating.toFixed(1) : '-'}
              </td>
              <td style={tdStyle}>
                <span style={{
                  ...sourceBadge,
                  backgroundColor: m.userSubmitted ? '#fef3c7' : '#dbeafe',
                  color: m.userSubmitted ? '#92400e' : '#1e40af',
                }}>
                  {m.userSubmitted ? 'User' : 'TMDB'}
                </span>
              </td>
              <td style={tdStyle}>
                {!mergeSource && (
                  <button onClick={() => setMergeSource(m.id)} style={editBtn}>
                    Merge
                  </button>
                )}
                {!m.tmdbId && (
                  <button onClick={() => { setLinkingId(m.id); setTmdbInput(''); }} style={editBtn}>
                    Link TMDB
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff',
  borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: 13,
};
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600,
};
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' };
const searchInput: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 220,
};
const editBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #d1d5db', padding: '3px 8px',
  borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4,
};
const mergeCard: React.CSSProperties = {
  backgroundColor: '#fffbeb', padding: 12, borderRadius: 8,
  marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
};
const selectStyle: React.CSSProperties = {
  padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, flex: 1,
};
const mergeBtn: React.CSSProperties = {
  padding: '6px 14px', backgroundColor: '#d97706', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const cancelBtn: React.CSSProperties = {
  padding: '6px 14px', backgroundColor: '#f3f4f6', color: '#374151',
  border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const sourceBadge: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
};
