import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';

interface Cinema {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  address: string | null;
  chain: string | null;
  city: string;
  active: boolean;
  _count?: { visits: number };
}

const emptyCinema = {
  id: '', name: '', latitude: '', longitude: '',
  radius: '100', address: '', chain: '', city: 'Chennai',
};

export default function Cinemas() {
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cinema | null>(null);
  const [form, setForm] = useState(emptyCinema);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCinemas();
  }, []);

  async function loadCinemas() {
    setLoading(true);
    try {
      const data = await api<Cinema[]>('/admin/cinemas');
      setCinemas(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyCinema);
    setShowForm(true);
  }

  function openEdit(c: Cinema) {
    setEditing(c);
    setForm({
      id: c.id,
      name: c.name,
      latitude: String(c.latitude),
      longitude: String(c.longitude),
      radius: String(c.radius),
      address: c.address || '',
      chain: c.chain || '',
      city: c.city,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        id: form.id || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius: parseInt(form.radius),
        address: form.address || null,
        chain: form.chain || null,
        city: form.city,
      };

      if (editing) {
        await api(`/admin/cinemas/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await api('/admin/cinemas', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setShowForm(false);
      loadCinemas();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Cinema) {
    try {
      await api(`/admin/cinemas/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !c.active }),
      });
      setCinemas((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)),
      );
    } catch {
      alert('Failed to update');
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Cinemas ({cinemas.length})</h1>
        <button onClick={openAdd} style={addBtn}>+ Add Cinema</button>
      </div>

      {showForm && (
        <div style={formCard}>
          <h3 style={{ margin: '0 0 16px' }}>
            {editing ? 'Edit Cinema' : 'Add Cinema'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input placeholder="Name *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            <input placeholder="Chain" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} style={inputStyle} />
            <input placeholder="Latitude *" required type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} style={inputStyle} />
            <input placeholder="Longitude *" required type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} style={inputStyle} />
            <input placeholder="Radius (m)" type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} style={inputStyle} />
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={inputStyle} />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{ ...inputStyle, gridColumn: '1 / -1' }} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={addBtn}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={cancelBtn}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Chain</th>
            <th style={thStyle}>City</th>
            <th style={thStyle}>Lat/Lng</th>
            <th style={thStyle}>Radius</th>
            <th style={thStyle}>Visits</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cinemas.map((c) => (
            <tr key={c.id} style={{ opacity: c.active ? 1 : 0.5 }}>
              <td style={tdStyle}>{c.name}</td>
              <td style={tdStyle}>{c.chain || '-'}</td>
              <td style={tdStyle}>{c.city}</td>
              <td style={tdStyle}>
                <span style={{ fontSize: 12, fontFamily: 'monospace' }}>
                  {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                </span>
              </td>
              <td style={tdStyle}>{c.radius}m</td>
              <td style={tdStyle}>{c._count?.visits ?? 0}</td>
              <td style={tdStyle}>
                <span style={{
                  ...statusBadge,
                  backgroundColor: c.active ? '#dcfce7' : '#fef2f2',
                  color: c.active ? '#166534' : '#991b1b',
                }}>
                  {c.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={tdStyle}>
                <button onClick={() => openEdit(c)} style={editBtn}>Edit</button>
                <button onClick={() => toggleActive(c)} style={editBtn}>
                  {c.active ? 'Deactivate' : 'Activate'}
                </button>
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
const addBtn: React.CSSProperties = {
  padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const cancelBtn: React.CSSProperties = {
  padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#374151',
  border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const editBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #d1d5db', padding: '3px 8px',
  borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4,
};
const statusBadge: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
};
const formCard: React.CSSProperties = {
  backgroundColor: '#fff', padding: 20, borderRadius: 8,
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginBottom: 16,
};
const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13,
};
