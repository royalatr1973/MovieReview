import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={containerStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <h1 style={{ margin: '0 0 24px', fontSize: 24 }}>CineReview Admin</h1>
        {error && <div style={errorStyle}>{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: '#f3f4f6',
};

const formStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: 32,
  borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  width: 360,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 12px',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  padding: '8px 12px',
  borderRadius: 6,
  fontSize: 13,
};
