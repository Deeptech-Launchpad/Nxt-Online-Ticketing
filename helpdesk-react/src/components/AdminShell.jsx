import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { showToast } from './Toast';

const SIDEBAR_W = 72;
const HEADER_H = 72;
const NAVY = '#02172E';
const RED  = '#CC3A3A';

function SidebarIcon({ icon, label, active, onClick, badge }) {
  const [hover, setHover] = useState(false);
  const showBadge = typeof badge === 'number' && badge > 0;
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
      {showBadge && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          background: RED, color: '#fff',
          minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
          border: `2px solid ${NAVY}`,
          fontSize: 10, fontWeight: 800, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
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

export function AdminShell({ children }) {
  const { currentUser, logout, fetchNotifications, tickets, fetchEmployees, fetchAllAssets } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const searchInputRef = useRef(null);
  const searchBoxRef = useRef(null);

  const initials = (currentUser?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isDark = theme === 'dark';

  // Sidebar Tickets badge — count of pending tickets (open + reopened only).
  // In-progress tickets are excluded because they're already being worked on.
  const pendingTicketCount = useMemo(
    () => tickets.filter(t => t.status === 'open' || t.status === 'reopened').length,
    [tickets]
  );

  // Load users + assets once for the global search (tickets already in AppContext)
  useEffect(() => {
    fetchEmployees().then(d => setAllUsers(Array.isArray(d) ? d : []));
    fetchAllAssets().then(d => setAllAssets(Array.isArray(d) ? d : []));
  }, []);

  // Close search dropdown when clicking outside the search box
  useEffect(() => {
    const onClick = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    if (searchOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [searchOpen]);

  // Global hotkeys: Ctrl+K focuses the search bar, Esc closes it
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Filter results — only run when there's a query of at least 2 chars
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return null;

    const ticketHits = tickets.filter(t =>
      (t.id           || '').toLowerCase().includes(q) ||
      (t.subject      || '').toLowerCase().includes(q) ||
      (t.employeeName || '').toLowerCase().includes(q) ||
      (t.category     || '').toLowerCase().includes(q) ||
      (t.status       || '').toLowerCase().includes(q)
    ).slice(0, 5);

    const userHits = allUsers.filter(u =>
      (u.name  || '').toLowerCase().includes(q) ||
      (u.id    || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.dept  || '').toLowerCase().includes(q)
    ).slice(0, 5);

    const assetHits = allAssets.filter(a =>
      (a.id            || '').toLowerCase().includes(q) ||
      (a.name          || '').toLowerCase().includes(q) ||
      (a.serial_number || '').toLowerCase().includes(q) ||
      (a.brand         || '').toLowerCase().includes(q) ||
      (a.type          || '').toLowerCase().includes(q)
    ).slice(0, 5);

    return { ticketHits, userHits, assetHits,
             total: ticketHits.length + userHits.length + assetHits.length };
  }, [search, tickets, allUsers, allAssets]);

  const handleResultClick = (type, idOrPath) => {
    setSearch('');
    setSearchOpen(false);
    if (type === 'ticket')   navigate(`/admin/tickets/${idOrPath}`);
    else if (type === 'user')  navigate('/admin/employees');
    else if (type === 'asset') navigate('/admin/assets');
  };

  // Poll admin notifications every 30s
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

  const go = (path) => navigate(path);

  const isActive = (path) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#0a1520' : '#f6f8fa' }}>
      {/* â”€â”€ SIDEBAR â”€â”€ */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
        background: NAVY, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '28px 0', zIndex: 1000,
        boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
      }}>
        <SidebarIcon icon="dashboard"            label="Dashboard"  active={isActive('/admin')}                                       onClick={() => go('/admin')} />
        <SidebarIcon icon="confirmation_number"  label="Tickets"    active={isActive('/admin/tickets')}                               onClick={() => go('/admin/tickets')} badge={pendingTicketCount} />
        <SidebarIcon icon="people"               label="Employees"  active={isActive('/admin/employees')}                             onClick={() => go('/admin/employees')} />
        <SidebarIcon icon="devices"              label="Assets"     active={isActive('/admin/assets')}                                onClick={() => go('/admin/assets')} />
        <SidebarIcon icon="bar_chart"            label="Reports"    active={isActive('/admin/reports')}                               onClick={() => go('/admin/reports')} />
        <div style={{ flex: 1 }} />
        <SidebarIcon icon="settings"             label="Settings"   active={isActive('/admin/settings')}                              onClick={() => go('/admin/settings')} />
      </div>

      {/* â”€â”€ HEADER â”€â”€ */}
      <div style={{
        position: 'fixed', top: 0, left: SIDEBAR_W, right: 0, height: HEADER_H,
        background: isDark ? 'rgba(11,17,32,0.95)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${isDark ? '#283a50' : 'rgba(0,0,0,0.08)'}`,
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: 20, zIndex: 100,
      }}>
        {/* Logo + label */}
        <div onClick={() => go('/admin')} style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
          <img src="/AltiusNXT_Logo-01.png" alt="Logo" style={{ height: 36, objectFit: 'contain' }} />
          <span style={{
            fontSize: 11, fontWeight: 800, color: RED, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif',
          }}>
            Admin Panel
          </span>
        </div>

        {/* Search bar — global jump-to search */}
        <div ref={searchBoxRef} style={{
          flex: 1, maxWidth: 500, marginLeft: 24, position: 'relative',
        }}>
          <div
            onClick={() => { searchInputRef.current?.focus(); setSearchOpen(true); }}
            style={{
              background: isDark ? '#161e2d' : '#F1F5F9',
              border: '1px solid transparent', borderRadius: 12,
              padding: '0 14px', height: 40,
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'text',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: isDark ? RED : '#94A3B8', fontSize: 20 }}>search</span>
            <input
              ref={searchInputRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search tickets, users, assets..."
              style={{
                background: 'transparent', border: 'none', outline: 'none', flex: 1,
                fontFamily: 'inherit', fontSize: 13, color: isDark ? '#fff' : '#0C0E10',
              }}
            />
            <kbd style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
              border: `1px solid ${isDark ? '#283a50' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 4, padding: '2px 6px',
              fontSize: 10, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748B',
            }}>Ctrl+K</kbd>
          </div>

          {/* Live results dropdown */}
          {searchOpen && searchResults && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: isDark ? '#1a2636' : '#fff',
              border: `1px solid ${isDark ? '#283a50' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
              maxHeight: 480, overflowY: 'auto', zIndex: 1000,
            }}>
              {searchResults.total === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: isDark ? '#94a3b8' : '#64748B' }}>
                  No results for <strong style={{ color: isDark ? '#fff' : NAVY }}>"{search}"</strong>
                </div>
              ) : (
                <>
                  {/* Tickets group */}
                  {searchResults.ticketHits.length > 0 && (
                    <ResultGroup label="Tickets" icon="confirmation_number" isDark={isDark}>
                      {searchResults.ticketHits.map(t => (
                        <ResultRow
                          key={`t-${t.id}`}
                          isDark={isDark}
                          icon="confirmation_number"
                          iconColor={RED}
                          primary={`${t.id} — ${t.subject}`}
                          secondary={`${t.employeeName || 'Unknown'} · ${t.category || 'General'} · ${t.status}`}
                          onClick={() => handleResultClick('ticket', t.id)}
                        />
                      ))}
                    </ResultGroup>
                  )}
                  {/* Employees group */}
                  {searchResults.userHits.length > 0 && (
                    <ResultGroup label="Employees" icon="person" isDark={isDark}>
                      {searchResults.userHits.map(u => (
                        <ResultRow
                          key={`u-${u.id}`}
                          isDark={isDark}
                          icon="person"
                          iconColor="#0EA5E9"
                          primary={u.name || u.email}
                          secondary={`${u.id} · ${u.email || '—'} · ${u.dept || '—'}`}
                          onClick={() => handleResultClick('user', u.id)}
                        />
                      ))}
                    </ResultGroup>
                  )}
                  {/* Assets group */}
                  {searchResults.assetHits.length > 0 && (
                    <ResultGroup label="Assets" icon="devices" isDark={isDark}>
                      {searchResults.assetHits.map(a => (
                        <ResultRow
                          key={`a-${a.id}`}
                          isDark={isDark}
                          icon="devices"
                          iconColor="#16a34a"
                          primary={`${a.id} — ${a.name}`}
                          secondary={`${a.brand || ''} ${a.type || ''} · SN ${a.serial_number || '—'}`}
                          onClick={() => handleResultClick('asset', a.id)}
                        />
                      ))}
                    </ResultGroup>
                  )}
                </>
              )}
              <div style={{
                padding: '8px 14px', borderTop: `1px solid ${isDark ? '#283a50' : '#f3f4f6'}`,
                fontSize: 10, color: isDark ? '#64748b' : '#94A3B8', textAlign: 'right',
              }}>
                Tip: press <kbd style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                  border: `1px solid ${isDark ? '#283a50' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 700,
                }}>Esc</kbd> to close
              </div>
            </div>
          )}
        </div>

        {/* Dark mode toggle - marginLeft:auto pushes this + everything after to the right corner */}
        <div
          onClick={toggleTheme}
          title={isDark ? 'Switch to light' : 'Switch to dark'}
          style={{
            marginLeft: 'auto',
            width: 40, height: 40, borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
            color: isDark ? '#fff' : '#475569',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </div>

        {/* Notifications bell */}
        <div
          onClick={() => go('/admin/notifications')}
          style={{
            position: 'relative', width: 40, height: 40, borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
            color: isDark ? '#fff' : '#475569',
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
          <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#fff' : '#0C0E10', lineHeight: 1.2 }}>
            {currentUser?.name || 'Admin'}
          </div>
          <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748B' }}>
            Solo IT Support
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
                borderRadius: 10, minWidth: 200, zIndex: 1000,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '10px 16px', fontSize: 12,
                color: isDark ? '#94a3b8' : '#64748B',
                borderBottom: `1px solid ${isDark ? '#283a50' : '#e0e6ee'}`,
              }}>
                {currentUser?.email || 'admin'}
              </div>
              <button
                onClick={() => { setProfileOpen(false); go('/admin/profile'); }}
                style={menuBtnStyle(isDark)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 8, verticalAlign: 'middle' }}>person</span>
                My Profile
              </button>
              <button onClick={handleLogout} style={{ ...menuBtnStyle(isDark), color: RED, borderTop: `1px solid ${isDark ? '#283a50' : '#e0e6ee'}` }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 8, verticalAlign: 'middle' }}>logout</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ CONTENT â”€â”€ */}
      <div style={{ marginLeft: SIDEBAR_W, paddingTop: HEADER_H, minHeight: '100vh' }}>
        <div style={{ padding: '32px 40px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function menuBtnStyle(isDark) {
  return {
    width: '100%', padding: '12px 16px', fontSize: 14, fontWeight: 600,
    color: isDark ? '#dce8f0' : '#0C0E10',
    background: 'transparent', border: 'none',
    cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
  };
}

/* ── Global-search dropdown helpers ─────────────────────────── */

function ResultGroup({ label, icon, isDark, children }) {
  return (
    <div>
      <div style={{
        padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6,
        background: isDark ? 'rgba(255,255,255,0.03)' : '#fafbfc',
        borderBottom: `1px solid ${isDark ? '#283a50' : '#f3f4f6'}`,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#94A3B8' }}>
          {icon}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 800, color: isDark ? '#94a3b8' : '#64748B',
          textTransform: 'uppercase', letterSpacing: '0.7px',
        }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function ResultRow({ icon, iconColor, primary, secondary, onClick, isDark }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 14px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        background: hover ? (isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc') : 'transparent',
        borderBottom: `1px solid ${isDark ? '#1f2d40' : '#f3f4f6'}`,
        transition: 'background 0.12s',
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: `${iconColor}1a`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: iconColor }}>
          {icon}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: isDark ? '#fff' : '#0C0E10',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {primary}
        </div>
        <div style={{
          fontSize: 11, color: isDark ? '#94a3b8' : '#64748B', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {secondary}
        </div>
      </div>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: isDark ? '#94a3b8' : '#94A3B8', flexShrink: 0 }}>
        arrow_forward
      </span>
    </div>
  );
}
