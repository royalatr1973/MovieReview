import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { setToken } from '../lib/api';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/cinemas', label: 'Cinemas' },
  { to: '/movies', label: 'Movies' },
];

export default function Layout() {
  const navigate = useNavigate();

  function handleLogout() {
    setToken(null);
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={sidebarStyle}>
        <h2 style={{ margin: '0 0 24px', fontSize: 18 }}>CineReview Admin</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                ...linkStyle,
                backgroundColor: isActive ? '#374151' : 'transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} style={logoutStyle}>
          Logout
        </button>
      </aside>
      <main style={{ flex: 1, padding: 24, backgroundColor: '#f9fafb' }}>
        <Outlet />
      </main>
    </div>
  );
}

const sidebarStyle: React.CSSProperties = {
  width: 220,
  backgroundColor: '#1f2937',
  color: '#fff',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
};

const linkStyle: React.CSSProperties = {
  color: '#d1d5db',
  textDecoration: 'none',
  padding: '8px 12px',
  borderRadius: 6,
  fontSize: 14,
};

const logoutStyle: React.CSSProperties = {
  marginTop: 'auto',
  background: 'none',
  border: '1px solid #4b5563',
  color: '#9ca3af',
  padding: '8px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
};
