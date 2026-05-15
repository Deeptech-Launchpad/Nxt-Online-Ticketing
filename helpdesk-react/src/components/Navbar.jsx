import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function Navbar() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoHover, setLogoHover] = useState(false);

  const initial = currentUser?.name?.[0]?.toUpperCase() || 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      position: 'fixed', top: 0, right: 0, left: 0,
      height: 64, display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '0 40px', zIndex: 50,
      background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--slate)', boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Logo */}
      <div 
        onClick={() => { if(currentUser) navigate(currentUser.role === 'admin' ? '/admin' : '/dashboard'); else navigate('/login'); }}
        onMouseEnter={() => setLogoHover(true)}
        onMouseLeave={() => setLogoHover(false)}
        style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, 
          cursor: 'pointer',
          transform: logoHover ? 'scale(1.03)' : 'scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' 
        }}
        title="Go to Dashboard"
      >
        <img 
          src="/AltiusNXT_Logo-01.png" 
          alt="AltiusNXT" 
          style={{ 
            height: 28, objectFit: 'contain', 
            filter: logoHover ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
            transition: 'filter 0.3s ease'
          }} 
        />
        <span style={{ 
          fontWeight: 800, 
          fontSize: 13, 
          fontFamily: 'DM Sans, sans-serif', 
          letterSpacing: '-0.3px', 
          lineHeight: 1,
          color: logoHover ? 'var(--blue)' : 'var(--navy)',
          transition: 'color 0.3s ease'
        }}>
          Online Ticketing
        </span>
      </div>

      {/* Center Nav Links */}
      {currentUser && (
        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {currentUser.role === 'employee' ? (
            <>
              <NavItem to="/dashboard" label="My Tickets" icon="confirmation_number" />
              <NavItem to="/raise-ticket" label="Raise Ticket" icon="add_circle" />
              <NavItem to="/history" label="History" icon="history" />
            </>
          ) : (
            <>
              <NavItem to="/admin" label="All Tickets" icon="dashboard" />
              <NavItem to="/admin/reports" label="Reports" icon="bar_chart" />
              <NavItem to="/admin/history" label="History" icon="history" />
              <NavItem to="/admin/assets" label="Asset Master" icon="devices" />
            </>
          )}
        </nav>
      )}

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {currentUser && (
          <>
            {/* Profile */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => setProfileOpen(o => !o)}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {currentUser.role === 'admin' ? 'IT Admin' : 'Employee'}
                  </div>
                </div>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                  {initial}
                </div>
              </div>
              {profileOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                  background: 'var(--white)', border: '1px solid var(--slate)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                  minWidth: 160, zIndex: 1000, overflow: 'hidden'
                }} onClick={() => setProfileOpen(false)}>
                  <div style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-muted)', borderBottom: '1px solid var(--slate)' }}>
                    {currentUser.division}
                  </div>
                  <button onClick={handleLogout} style={{
                    width: '100%', padding: '10px 16px', fontSize: 14, fontWeight: 600,
                    color: 'var(--danger)', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif'
                  }}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function NavItem({ to, label, icon }) {
  return (
    <NavLink to={to} end style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 'var(--radius-md)',
      fontSize: 14, fontWeight: 600, transition: 'all 0.18s',
      textDecoration: 'none', cursor: 'pointer',
      color: isActive ? 'var(--blue-light)' : 'var(--text-secondary)',
      background: isActive ? 'rgba(204,58,58,0.08)' : 'transparent',
      borderBottom: isActive ? '2px solid var(--blue-light)' : '2px solid transparent',
      borderRadius: 0
    })}>
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
      {label}
    </NavLink>
  );
}
