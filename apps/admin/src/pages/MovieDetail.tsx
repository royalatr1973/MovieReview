import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Movie {
  id: string;
  title: string;
  year: number | null;
  language: string | null;
  tmdbId: number | null;
  posterUrl: string | null;
  userSubmitted: boolean;
}

interface Review {
  id: string;
  rating: number;
  reviewText: string | null;
  spoilerFlag: boolean;
  createdAt: string;
  user: { displayName: string | null; email: string };
  visit: { cinema: { name: string } };
}

interface MovieDetailResponse {
  movie: Movie;
  reviews: Review[];
  avgRating: number | null;
  reviewCount: number;
}

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<MovieDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ rating: 0, reviewText: '' });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api<MovieDetailResponse>(`/admin/movies/${id}/reviews`);
      setData(res);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(r: Review) {
    setEditingReview(r.id);
    setEditForm({ rating: r.rating, reviewText: r.reviewText || '' });
  }

  async function saveEdit(reviewId: string) {
    try {
      await api(`/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          rating: editForm.rating,
          reviewText: editForm.reviewText || null,
        }),
      });
      setEditingReview(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function deleteReview(reviewId: string) {
    if (!confirm('Delete this review?')) return;
    try {
      await api(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
      loadData();
    } catch {
      alert('Failed to delete');
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: '#dc2626' }}>Error: {error}</div>;
  if (!data) return <div>Not found</div>;

  const { movie, reviews, avgRating, reviewCount } = data;

  // Rating distribution
  const dist = [1, 2, 3, 4, 5].map((r) => reviews.filter((rev) => rev.rating === r).length);
  const maxDist = Math.max(...dist, 1);

  return (
    <div>
      <button onClick={() => navigate('/movies')} style={backBtn}>
        &larr; Back to Movies
      </button>

      {/* Movie header */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, backgroundColor: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt="" style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 6 }} />
        ) : (
          <div style={{ width: 80, height: 120, backgroundColor: '#e5e7eb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>
            No poster
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>{movie.title}</h1>
          <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>
            {[movie.year, movie.language, movie.userSubmitted ? 'User-submitted' : 'TMDB'].filter(Boolean).join(' . ')}
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#fbbf24' }}>
                {avgRating != null ? avgRating.toFixed(1) : '-'}
              </span>
              <span style={{ color: '#6b7280', fontSize: 14, marginLeft: 4 }}>/5</span>
            </div>
            <div style={{ color: '#6b7280', fontSize: 14 }}>
              {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </div>
          </div>
        </div>
      </div>

      {/* Rating distribution */}
      {reviewCount > 0 && (
        <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Rating Distribution</h3>
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 20, textAlign: 'right', fontSize: 13, color: '#6b7280' }}>{star}</span>
              <span style={{ color: '#fbbf24', fontSize: 12 }}>&#9733;</span>
              <div style={{ flex: 1, height: 12, backgroundColor: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(dist[star - 1] / maxDist) * 100}%`, backgroundColor: '#2563eb', borderRadius: 6 }} />
              </div>
              <span style={{ width: 24, textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{dist[star - 1]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reviews list */}
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>All Reviews ({reviews.length})</h3>
      {reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No reviews yet</div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Cinema</th>
              <th style={thStyle}>Rating</th>
              <th style={thStyle}>Review</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r, i) => (
              <tr key={r.id}>
                <td style={{ ...tdStyle, color: '#9ca3af', fontWeight: 600 }}>{i + 1}</td>
                <td style={tdStyle}>{r.user.displayName || r.user.email}</td>
                <td style={tdStyle}>{r.visit.cinema.name}</td>
                <td style={tdStyle}>
                  {editingReview === r.id ? (
                    <select
                      value={editForm.rating}
                      onChange={(e) => setEditForm({ ...editForm, rating: parseInt(e.target.value) })}
                      style={{ padding: 4, borderRadius: 4, border: '1px solid #d1d5db' }}
                    >
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>{v} &#9733;</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <span style={{ color: '#fbbf24' }}>{'★'.repeat(r.rating)}</span>
                      <span style={{ color: '#d1d5db' }}>{'★'.repeat(5 - r.rating)}</span>
                    </>
                  )}
                </td>
                <td style={{ ...tdStyle, maxWidth: 250 }}>
                  {editingReview === r.id ? (
                    <textarea
                      value={editForm.reviewText}
                      onChange={(e) => setEditForm({ ...editForm, reviewText: e.target.value })}
                      style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13, minHeight: 50 }}
                    />
                  ) : (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                      {r.spoilerFlag && <span style={spoilerBadge}>SPOILER</span>}
                      {r.reviewText || '-'}
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  {new Date(r.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </td>
                <td style={tdStyle}>
                  {editingReview === r.id ? (
                    <>
                      <button onClick={() => saveEdit(r.id)} style={saveBtn}>Save</button>
                      <button onClick={() => setEditingReview(null)} style={editBtn}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(r)} style={editBtn}>Edit</button>
                      <button onClick={() => deleteReview(r.id)} style={deleteBtn}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer',
  fontSize: 14, padding: 0, marginBottom: 16, display: 'block',
};
const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff',
  borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: 13,
};
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600,
};
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' };
const editBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #d1d5db', padding: '3px 8px',
  borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4,
};
const saveBtn: React.CSSProperties = {
  background: '#2563eb', color: '#fff', border: 'none', padding: '3px 8px',
  borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4,
};
const deleteBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #fca5a5', color: '#dc2626',
  padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
};
const spoilerBadge: React.CSSProperties = {
  backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 6px',
  borderRadius: 3, fontSize: 10, fontWeight: 600, marginRight: 6,
};
