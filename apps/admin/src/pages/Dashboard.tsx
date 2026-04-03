import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { api } from '../lib/api';

interface Stats {
  totalUsers: number;
  totalReviews: number;
  totalVisits: number;
  totalCinemas: number;
  totalMovies: number;
  reviewsPerDay: { date: string; count: number }[];
  topMovies: { id: string; title: string; reviewCount: number; avgRating: number }[];
  topCinemas: { id: string; name: string; visitCount: number }[];
  ratingDistribution: { rating: number; count: number }[];
}

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#65a30d'];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Stats>('/admin/stats')
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ color: '#dc2626' }}>Error: {error}</div>;
  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: 22 }}>Dashboard</h1>

      {/* Summary cards */}
      <div style={cardGrid}>
        <StatCard label="Users" value={stats.totalUsers} />
        <StatCard label="Reviews" value={stats.totalReviews} />
        <StatCard label="Visits" value={stats.totalVisits} />
        <StatCard label="Cinemas" value={stats.totalCinemas} />
        <StatCard label="Movies" value={stats.totalMovies} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 24 }}>
        {/* Reviews per day */}
        <div style={chartCard}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Reviews per Day (Last 30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.reviewsPerDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rating distribution */}
        <div style={chartCard}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Rating Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats.ratingDistribution}
                dataKey="count"
                nameKey="rating"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ rating, count }) => `${rating}★ (${count})`}
              >
                {stats.ratingDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
        <div style={chartCard}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Top Movies</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Reviews</th>
                <th style={thStyle}>Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {stats.topMovies.map((m) => (
                <tr key={m.id}>
                  <td style={tdStyle}>{m.title}</td>
                  <td style={tdStyle}>{m.reviewCount}</td>
                  <td style={tdStyle}>{m.avgRating.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={chartCard}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Top Cinemas</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Visits</th>
              </tr>
            </thead>
            <tbody>
              {stats.topCinemas.map((c) => (
                <tr key={c.id}>
                  <td style={tdStyle}>{c.name}</td>
                  <td style={tdStyle}>{c.visitCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={statCardStyle}>
      <div style={{ fontSize: 13, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value.toLocaleString()}</div>
    </div>
  );
}

const cardGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 16,
};

const statCardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: 20,
  borderRadius: 8,
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

const chartCard: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: 20,
  borderRadius: 8,
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: '1px solid #e5e7eb',
  color: '#6b7280',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid #f3f4f6',
};
