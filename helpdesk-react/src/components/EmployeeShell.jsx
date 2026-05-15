import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { showToast } from './Toast';

const SIDEBAR_W = 72;
const HEADER_H = 72;
const NAVY = '#02172E';
const RED  = '#CC3A3A';

function SidebarIcon({ icon, label, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 48, height: 48, marginBottom: 14, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative',
        background: active ? RED : (hover ? 'rgba(255,255,255,0.08)' : 'transparent'),
        color: active || hover ? '#fff' : 'rgba(255,255,255,0.6)',
        boxShadow: active ? '0 6px 14px rgba(204,58,58,0.3)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{icon}</span>
      {hover && (
        <div style={{
          position: 'absolute', left: 58, top: '50%', transform: 'translateY(-50%)',
          background: NAVY, color: '#fff', padding: '6px 12px', borderRadius: 6,
          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)', zIndex: 2000, pointerEvents: 'none',
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

export function EmployeeShell({ children }) {
  const { currentUser, logout, fetchNotifications } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const initials = (currentUser?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isDark = theme === 'dark';

  // Poll for unread notifications every 30s
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const items = await fetchNotifications();
      if (!cancelled) setUnreadCount(items.filter(n => !n.is_read).length);
    };
    refresh();
    const id = setInterval(refresh, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [currentUser, location.pathname]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const handleSidebarNav = (key) => {
    if (key === 'dashboard')          navigate('/dashboard');
    else if (key === 'tickets')       navigate('/history');
    else if (key === 'assets')        navigate('/assets');
    else if (key === 'notifications') navigate('/notifications');
    else if (key === 'profile')       navigate('/profile');
    else showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} â€” coming soon`, '');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#0a1520' : '#f6f8fa' }}>
      {/* â”€â”€ SIDEBAR â”€â”€ */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
        background: NAVY, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '28px 0', zIndex: 1000,
        boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
      }}>
        <SidebarIcon icon="home"                 label="Dashboard"     active={isActive('/dashboard')}                                              onClick={() => handleSidebarNav('dashboard')} />
        <SidebarIcon icon="confirmation_number"  label="My Tickets"    active={isActive('/history') || location.pathname.startsWith('/tickets')}    onClick={() => handleSidebarNav('tickets')} />
        <SidebarIcon icon="devices"              label="My Assets"     active={isActive('/assets')}                                                 onClick={() => handleSidebarNav('assets')} />
        <SidebarIcon icon="notifications"        label="Notifications" active={isActive('/notifications')}                                          onClick={() => handleSidebarNav('notifications')} />
        <div style={{ flex: 1 }} />
        <SidebarIcon icon="person" label="Profile" active={false} onClick={() => handleSidebarNav('profile')} />
      </div>

      {/* â”€â”€ HEADER â”€â”€ */}
      <div style={{
        position: 'fixed', top: 0, left: SIDEBAR_W, right: 0, height: HEADER_H,
        background: isDark ? 'rgba(11,17,32,0.95)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${isDark ? '#283a50' : 'rgba(0,0,0,0.08)'}`,
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: 24, zIndex: 100,
      }}>
        {/* Logo + label */}
        <div
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
        >
          <img src="/AltiusNXT_Logo-01.png" alt="Logo" style={{ height: 36, objectFit: 'contain' }} />
          <span style={{
            fontSize: 11, fontWeight: 800, color: RED, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif',
          }}>
            Employee Portal
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Dark mode toggle */}
        <div
          onClick={toggleTheme}
          title={isDark ? 'Switch to light' : 'Switch to dark'}
          style={{
            width: 40, height: 40, borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
            color: isDark ? '#fff' : '#475569', transition: 'all 0.2s',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </div>

        {/* Notifications bell */}
        <div
          onClick={() => navigate('/notifications')}
          style={{
            position: 'relative', width: 40, height: 40, borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
            color: isDark ? '#fff' : '#475569', transition: 'all 0.2s',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              background: RED, color: '#fff', fontSize: 9, fontWeight: 800,
              minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8,
              border: `2px solid ${isDark ? '#0b1120' : '#fff'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        {/* User info */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: isDark ? '#fff' : '#0C0E10', lineHeight: 1.2,
          }}>
            {currentUser?.name || 'User'}
          </div>
          <div style={{
            fontSize: 11, color: isDark ? '#94a3b8' : '#64748B',
          }}>
            {currentUser?.role === 'admin' ? 'IT Admin' : (currentUser?.dept || 'Employee')}
          </div>
        </div>

        {/* Avatar with dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setProfileOpen(o => !o)}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: `linear-gradient(135deg, ${RED}, ${NAVY})`,
              color: '#fff', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {initials}
          </div>
          {profileOpen && (
            <div
              onMouseLeave={() => setProfileOpen(false)}
              style={{
                position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                background: isDark ? '#1a2636' : '#fff',
                border: `1px solid ${isDark ? '#283a50' : '#e0e6ee'}`,
                borderRadius: 10, minWidth: 180, zIndex: 1000,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '10px 16px', fontSize: 12,
                color: isDark ? '#94a3b8' : '#64748B',
                borderBottom: `1px solid ${isDark ? '#283a50' : '#e0e6ee'}`,
              }}>
                {currentUser?.division || ''}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '12px 16px', fontSize: 14, fontWeight: 600,
                  color: RED, background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ CONTENT â”€â”€ */}
      <div style={{
        marginLeft: SIDEBAR_W, paddingTop: HEADER_H,
        minHeight: '100vh',
      }}>
        <div style={{ padding: '32px 40px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
