import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

interface EmployeeVisit {
  id: string;
  entryTime: string;
  exitTime: string | null;
  dwellMinutes: number | null;
  locationConfidence: number;
  qualificationState: string;
  user: { id: string; email: string; displayName: string | null };
  cinema: { id: string; name: string };
}

export default function EmployeeCheck() {
  const [visits, setVisits] = useState<EmployeeVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<EmployeeVisit[]>('/admin/visits/employee-check');
      setVisits(res);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load employee-check visits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateState = async (id: string, qualificationState: string) => {
    setUpdating(id);
    try {
      await api(`/admin/visits/${id}/qualification`, {
        method: 'PATCH',
        body: JSON.stringify({ qualificationState }),
      });
      setVisits((vs) => vs.filter((v) => v.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <h1>Employee-check Visits</h1>
      <p style={{ color: '#888', fontSize: 14 }}>
        Visits flagged as possible employee activity (too long or too frequent).
        Approve to keep as a normal visit, or reject to discard it.
      </p>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {!loading && visits.length === 0 && (
        <p>No employee-check visits pending review.</p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
            <th style={{ padding: 8 }}>User</th>
            <th style={{ padding: 8 }}>Cinema</th>
            <th style={{ padding: 8 }}>Entry</th>
            <th style={{ padding: 8 }}>Dwell (min)</th>
            <th style={{ padding: 8 }}>Confidence</th>
            <th style={{ padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((v) => (
            <tr key={v.id} style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: 8 }}>
                {v.user.displayName ?? v.user.email}
                <div style={{ color: '#888', fontSize: 12 }}>{v.user.email}</div>
              </td>
              <td style={{ padding: 8 }}>{v.cinema.name}</td>
              <td style={{ padding: 8 }}>{new Date(v.entryTime).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{v.dwellMinutes ?? '—'}</td>
              <td style={{ padding: 8 }}>{v.locationConfidence.toFixed(2)}</td>
              <td style={{ padding: 8 }}>
                <button
                  onClick={() => updateState(v.id, 'full_review')}
                  disabled={updating === v.id}
                  style={{ marginRight: 8 }}
                >
                  Approve
                </button>
                <button
                  onClick={() => updateState(v.id, 'discarded')}
                  disabled={updating === v.id}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
