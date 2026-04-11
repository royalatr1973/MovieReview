import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

interface Review {
  id: string;
  rating: number;
  reviewText: string | null;
  rawTitle: string | null;
  spoilerFlag: boolean;
  createdAt: string;
  user: { id: string; email: string; displayName: string | null };
  movie: { id: string; title: string } | null;
  visit: { cinema: { name: string } };
}

interface ReviewsResponse {
  data: Review[];
  total: number;
  page: number;
  totalPages: number;
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ rating: 0, reviewText: '' });

  const loadReviews = useCallback(async (p: number, q?: string) => {
    setLoading(true);
    try {
      const query = q ?? search;
      const endpoint = query.length >= 2
        ? `/admin/reviews/search?q=${encodeURIComponent(query)}&page=${p}&limit=20`
        : `/admin/reviews?page=${p}&limit=20`;
      const res = await api<ReviewsResponse>(endpoint);
      setReviews(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setPage(p);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadReviews(1);
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadReviews(page), 30_000);
    return () => clearInterval(interval);
  }, [loadReviews]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: string) {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api(`/admin/reviews/${id}`, { method: 'DELETE' });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
    } catch {
      alert('Failed to delete review');
    } finally {
      setDeleting(null);
    }
  }

  function startEdit(r: Review) {
    setEditingId(r.id);
    setEditForm({ rating: r.rating, reviewText: r.reviewText || '' });
  }

  async function saveEdit(id: string) {
    try {
      await api(`/admin/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ rating: editForm.rating, reviewText: editForm.reviewText || null }),
      });
      setEditingId(null);
      loadReviews(page);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Save failed');
    }
  }

  // Server-side search: debounce and reload
  useEffect(() => {
    const timer = setTimeout(() => {
      loadReviews(1, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = reviews;

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ', ' + d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>Reviews</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            {total} total reviews
          </p>
        </div>
        <input
          placeholder="Search by movie, user, or cinema..."
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

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Movie</th>
                <th style={thStyle}>Cinema</th>
                <th style={thStyle}>Rating</th>
                <th style={thStyle}>Review</th>
                <th style={thStyle}>Date & Time</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>
                    {r.user.displayName || r.user.email}
                  </td>
                  <td style={tdStyle}>
                    {r.movie?.title || r.rawTitle || '-'}
                  </td>
                  <td style={tdStyle}>{r.visit.cinema.name}</td>
                  <td style={tdStyle}>
                    {editingId === r.id ? (
                      <select value={editForm.rating} onChange={(e) => setEditForm({ ...editForm, rating: parseInt(e.target.value) })} style={{ padding: 4, borderRadius: 4, border: '1px solid #d1d5db' }}>
                        {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} ★</option>)}
                      </select>
                    ) : (
                      <>
                        <span style={{ color: '#fbbf24' }}>{'★'.repeat(r.rating)}</span>
                        <span style={{ color: '#d1d5db' }}>{'★'.repeat(5 - r.rating)}</span>
                      </>
                    )}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 200 }}>
                    {editingId === r.id ? (
                      <input value={editForm.reviewText} onChange={(e) => setEditForm({ ...editForm, reviewText: e.target.value })} style={{ width: '100%', padding: 4, borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }} />
                    ) : (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                        {r.spoilerFlag && <span style={spoilerBadge}>SPOILER</span>}
                        {r.reviewText || '-'}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {formatDateTime(r.createdAt)}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {editingId === r.id ? (
                      <>
                        <button onClick={() => saveEdit(r.id)} style={{ ...deleteBtn, borderColor: '#86efac', color: '#16a34a' }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ ...deleteBtn, borderColor: '#d1d5db', color: '#6b7280', marginLeft: 4 }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(r)} style={{ ...deleteBtn, borderColor: '#93c5fd', color: '#2563eb' }}>Edit</button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deleting === r.id}
                          style={{ ...deleteBtn, marginLeft: 4 }}
                        >
                          {deleting === r.id ? '...' : 'Delete'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: 24, color: '#9ca3af' }}>
                    {search ? `No reviews matching "${search}"` : 'No reviews yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button
              onClick={() => loadReviews(page - 1)}
              disabled={page <= 1}
              style={pageBtn}
            >
              Previous
            </button>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => loadReviews(page + 1)}
              disabled={page >= totalPages}
              style={pageBtn}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
  color: '#374151',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #f3f4f6',
};

const searchInput: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
  width: 280,
};

const deleteBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid #fca5a5',
  color: '#dc2626',
  padding: '4px 10px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};

const pageBtn: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};

const spoilerBadge: React.CSSProperties = {
  backgroundColor: '#fef3c7',
  color: '#92400e',
  padding: '1px 6px',
  borderRadius: 3,
  fontSize: 10,
  fontWeight: 600,
  marginRight: 6,
};
