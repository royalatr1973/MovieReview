const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

let token: string | null = localStorage.getItem('admin_token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('admin_token', t);
  else localStorage.removeItem('admin_token');
}

export function getToken() {
  return token;
}

export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
