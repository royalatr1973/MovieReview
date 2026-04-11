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

type SortField = 'name' | 'visits' | 'city' | 'chain';

const emptyCinema = {
  id: '', name: '', latitude: '', longitude: '',
  radius: '100', address: '', chain: '', city: 'Chennai',
};

export default function Cinemas() {
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cinema | null>(null);
  const [form, setForm] = useState(emptyCinema);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('visits');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    loadCinemas();
  }, []);

  async function loadCinemas() {
    setLoading(true);
    try {
      const data = await api<Cinema[]>('/admin/cinemas');
      setCinemas(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load cinemas');
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
      setForm(emptyCinema);
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

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' || field === 'city'); // alphabetic = asc default
    }
  }

  // Filter + sort
  const lowerSearch = search.toLowerCase();
  const filtered = cinemas
    .filter(
      (c) =>
        search.length === 0 ||
        c.name.toLowerCase().includes(lowerSearch) ||
        (c.chain ?? '').toLowerCase().includes(lowerSearch) ||
        c.city.toLowerCase().includes(lowerSearch)
    )
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'visits':
          cmp = (a._count?.visits ?? 0) - (b._count?.visits ?? 0);
          break;
        case 'city':
          cmp = a.city.localeCompare(b.city);
          break;
        case 'chain':
          cmp = (a.chain ?? '').localeCompare(b.chain ?? '');
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

  const sortIcon = (field: SortField) =>
    sortField === field ? (sortAsc ? ' \u25B2' : ' \u25BC') : '';

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Cinemas ({cinemas.length})</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            placeholder="Search cinemas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInputStyle}
          />
          <button onClick={openAdd} style={addBtn}>+ Add Cinema</button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

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
            <th style={thStyle}>#</th>
            <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('name')}>
              Name{sortIcon('name')}
            </th>
            <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('chain')}>
              Chain{sortIcon('chain')}
            </th>
            <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('city')}>
              City{sortIcon('city')}
            </th>
            <th style={thStyle}>Lat/Lng</th>
            <th style={thStyle}>Radius</th>
            <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('visits')}>
              Visits{sortIcon('visits')}
            </th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c, i) => (
            <tr key={c.id} style={{ opacity: c.active ? 1 : 0.5 }}>
              <td style={{ ...tdStyle, color: '#9ca3af', fontWeight: 600 }}>{i + 1}</td>
              <td style={tdStyle}>{c.name}</td>
              <td style={tdStyle}>{c.chain || '-'}</td>
              <td style={tdStyle}>{c.city}</td>
              <td style={tdStyle}>
                <span style={{ fontSize: 12, fontFamily: 'monospace' }}>
                  {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                </span>
              </td>
              <td style={tdStyle}>{c.radius}m</td>
              <td style={tdStyle}>
                <strong>{c._count?.visits ?? 0}</strong>
              </td>
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
          {filtered.length === 0 && (
            <tr>
              <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: 24, color: '#9ca3af' }}>
                {search ? `No cinemas matching "${search}"` : 'No cinemas yet'}
              </td>
            </tr>
          )}
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
  borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' };
const searchInputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 220,
};
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
