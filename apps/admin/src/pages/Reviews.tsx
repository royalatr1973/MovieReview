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
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadReviews = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api<ReviewsResponse>(`/admin/reviews?page=${p}&limit=20`);
      setReviews(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setPage(p);
    } catch {
      // handled by api redirect
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews(1);
  }, [loadReviews]);

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

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Reviews</h1>
      <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 14 }}>
        {total} total reviews
      </p>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Movie</th>
                <th style={thStyle}>Cinema</th>
                <th style={thStyle}>Rating</th>
                <th style={thStyle}>Review</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>
                    {r.user.displayName || r.user.email}
                  </td>
                  <td style={tdStyle}>
                    {r.movie?.title || r.rawTitle || '-'}
                  </td>
                  <td style={tdStyle}>{r.visit.cinema.name}</td>
                  <td style={tdStyle}>{'★'.repeat(r.rating)}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.spoilerFlag && <span style={spoilerBadge}>SPOILER</span>}
                    {r.reviewText || '-'}
                  </td>
                  <td style={tdStyle}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting === r.id}
                      style={deleteBtn}
                    >
                      {deleting === r.id ? '...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
