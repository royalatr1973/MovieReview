import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  passwordHash: string;
  passwordPlain: string | null;
  createdAt: string;
  _count: { reviews: number; visits: number };
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Password visibility
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api<User[]>('/admin/users');
      setUsers(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(u: User) {
    setEditId(u.id);
    setEditEmail(u.email);
    setEditName(u.displayName || '');
    setEditPassword('');
    setSaveMsg(null);
  }

  function cancelEdit() {
    setEditId(null);
    setEditPassword('');
    setSaveMsg(null);
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, string> = {
        email: editEmail,
        displayName: editName,
      };
      if (editPassword.trim()) {
        body.newPassword = editPassword.trim();
      }
      const updated = await api<User>(`/admin/users/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setUsers((prev) => prev.map((u) => (u.id === editId ? updated : u)));
      setSaveMsg('Saved!');
      setTimeout(() => { setEditId(null); setSaveMsg(null); }, 1200);
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const lowerSearch = search.toLowerCase();
  const filtered = users.filter(
    (u) =>
      search.length === 0 ||
      (u.displayName ?? '').toLowerCase().includes(lowerSearch) ||
      u.email.toLowerCase().includes(lowerSearch)
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Users ({users.length})</h1>
        <input
          placeholder="Search users..."
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

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Password</th>
              <th style={thStyle}>Reviews</th>
              <th style={thStyle}>Visits</th>
              <th style={thStyle}>Joined</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id}>
                {editId === u.id ? (
                  <>
                    <td style={{ ...tdStyle, color: '#9ca3af', fontWeight: 600 }}>{i + 1}</td>
                    <td style={tdStyle}>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={editInput}
                        placeholder="Display name"
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        style={editInput}
                        placeholder="Email"
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        style={editInput}
                        placeholder="New password (leave blank to keep)"
                        type="text"
                      />
                    </td>
                    <td style={tdStyle}><strong>{u._count.reviews}</strong></td>
                    <td style={tdStyle}><strong>{u._count.visits}</strong></td>
                    <td style={tdStyle}>
                      {new Date(u.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={saveEdit} disabled={saving} style={saveBtn}>
                          {saving ? '...' : saveMsg || 'Save'}
                        </button>
                        <button onClick={cancelEdit} style={cancelBtn}>Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ ...tdStyle, color: '#9ca3af', fontWeight: 600 }}>{i + 1}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={avatarStyle}>
                          {(u.displayName || u.email).charAt(0).toUpperCase()}
                        </div>
                        {u.displayName || '-'}
                      </div>
                    </td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>
                      {u.passwordPlain ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <code style={{ fontSize: 13, color: '#111827', backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: 4 }}>
                            {showPasswordId === u.id ? u.passwordPlain : '********'}
                          </code>
                          <button
                            onClick={() => setShowPasswordId(showPasswordId === u.id ? null : u.id)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#2563eb' }}
                          >
                            {showPasswordId === u.id ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>
                          Not available (user must login once to backfill)
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}><strong>{u._count.reviews}</strong></td>
                    <td style={tdStyle}><strong>{u._count.visits}</strong></td>
                    <td style={tdStyle}>
                      {new Date(u.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => startEdit(u)} style={editBtn}>Edit</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: 24, color: '#9ca3af' }}>
                  {search ? `No users matching "${search}"` : 'No users yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fffbeb', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
        <strong>Note:</strong> Passwords are stored as bcrypt hashes (cannot be reversed). Use the Edit button to set a new password for any user.
      </div>
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
const editInput: React.CSSProperties = {
  padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, width: '100%',
};
const avatarStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563eb',
  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, fontWeight: 700,
};
const editBtn: React.CSSProperties = {
  padding: '4px 12px', border: '1px solid #93c5fd', borderRadius: 4,
  backgroundColor: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: 12, fontWeight: 600,
};
const saveBtn: React.CSSProperties = {
  padding: '4px 12px', border: '1px solid #86efac', borderRadius: 4,
  backgroundColor: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontSize: 12, fontWeight: 600,
};
const cancelBtn: React.CSSProperties = {
  padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: 4,
  backgroundColor: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600,
};
