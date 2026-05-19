import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { showToast } from '../components/Toast';

const RED   = '#CC3A3A';
const NAVY  = '#02172E';
const GREEN = '#16a34a';
const AMBER = '#F59E0B';
const BLUE  = '#0EA5E9';

/* Group notification by date bucket */
function bucketOf(createdAt) {
  if (!createdAt) return 'week';
  const d = new Date(createdAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d >= startOfToday)     return 'today';
  if (d >= startOfYesterday) return 'yesterday';
  return 'week';
}

/* Map a DB notification â†’ display shape */
function mapDbNotif(n) {
  // pick icon + colors based on type + severity
  let icon = 'notifications', iconBg = '#eff6ff', iconColor = BLUE;
  if (n.type === 'ticket') {
    if (n.severity === 'critical') { icon = 'warning';            iconBg = '#fef2f2'; iconColor = '#dc2626'; }
    else if (n.title.includes('replied')) { icon = 'schedule';    iconBg = '#fffbeb'; iconColor = AMBER; }
    else                                   { icon = 'confirmation_number'; iconBg = '#f0fdf4'; iconColor = GREEN; }
  } else if (n.type === 'asset') {
    icon = 'computer'; iconBg = '#eff6ff'; iconColor = BLUE;
  } else if (n.type === 'system') {
    icon = 'settings'; iconBg = '#fdf4ff'; iconColor = '#9333ea';
  }

  const time = new Date(n.created_at);
  const isToday = bucketOf(n.created_at) === 'today';
  const timeText = isToday
    ? `Today, ${time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    : time.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return {
    id: n.id,
    type: n.type,
    section: bucketOf(n.created_at),
    unread: !n.is_read,
    icon, iconBg, iconColor,
    title: n.title,
    description: n.description || '',
    time: timeText,
    relatedId: n.related_id,
  };
}

// Placeholder demo data removed - notifications are now driven entirely by the backend.

const SECTION_LABELS = { today: 'TODAY', yesterday: 'YESTERDAY', week: 'THIS WEEK' };

export default function Notifications() {
  const navigate = useNavigate();
  const { fetchNotifications, markNotifRead, markAllNotifRead } = useApp();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState(null);   // null = loading, [] = empty, [...] = data

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      fetchNotifications().then(rows => {
        if (cancelled) return;
        setItems((rows || []).map(mapDbNotif));
      });
    };
    refresh();
    // Poll every 15s so new notifications appear without a page refresh
    const id = setInterval(refresh, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (items === null) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading notifications...</div>;
  }

  const unreadCount = items.filter(n => n.unread).length;

  const visible = items.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return n.unread;
    return n.type === filter;
  });

  const grouped = visible.reduce((acc, n) => {
    if (!acc[n.section]) acc[n.section] = [];
    acc[n.section].push(n);
    return acc;
  }, {});

  const markAllRead = async () => {
    setItems(prev => prev.map(n => ({ ...n, unread: false })));
    await markAllNotifRead();
    showToast('All notifications marked as read', 'success');
  };

  const handleNotifClick = async (n) => {
    if (n.unread) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x));
      await markNotifRead(n.id);
    }
    const isAdmin = window.location.pathname.startsWith('/admin');
    if (n.type === 'ticket' && n.relatedId) {
      // ticket detail - admin sees /admin/tickets, employee sees /tickets
      navigate(isAdmin ? `/admin/tickets/${n.relatedId}` : `/tickets/${n.relatedId}`);
    } else if (n.type === 'asset') {
      // asset notifications â†’ admin Asset Master, employee My Assets
      navigate(isAdmin ? '/admin/assets' : '/assets');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{
          fontSize: 27, fontWeight: 700, color: NAVY,
          letterSpacing: '-0.6px', fontFamily: 'DM Sans, sans-serif',
        }}>
          Notifications
        </h1>
        <span
          onClick={markAllRead}
          style={{ fontSize: 12, color: RED, fontWeight: 600, cursor: 'pointer' }}
        >
          Mark all as read
        </span>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <FilterTab label="All"     active={filter === 'all'}    onClick={() => setFilter('all')} />
        <FilterTab label="Unread"  active={filter === 'unread'} onClick={() => setFilter('unread')} count={unreadCount} />
        <FilterTab label="Tickets" active={filter === 'ticket'} onClick={() => setFilter('ticket')} />
        <FilterTab label="Assets"  active={filter === 'asset'}  onClick={() => setFilter('asset')} />
      </div>

      {/* SECTIONED LIST */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyAllRead />
      ) : (
        ['today', 'yesterday', 'week'].map(section => (
          grouped[section] && grouped[section].length > 0 && (
            <div key={section}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                margin: '16px 0 8px',
              }}>
                {SECTION_LABELS[section]}
              </div>
              {grouped[section].map(n => (
                <NotifItem key={n.id} notif={n} onClick={() => handleNotifClick(n)} />
              ))}
            </div>
          )
        ))
      )}

      {Object.keys(grouped).length > 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>
            check_circle
          </span>
          <div style={{ fontWeight: 600, fontSize: 13 }}>You are all caught up!</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>No more notifications to show.</div>
        </div>
      )}
    </div>
  );
}

function FilterTab({ label, active, onClick, count }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', border: '1px solid var(--slate)',
        background: active ? RED : 'var(--white)',
        color: active ? '#fff' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: active ? '0 4px 12px rgba(204,58,58,0.25)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      {label}
      {count > 0 && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.25)' : RED,
          color: '#fff',
          padding: '1px 6px', borderRadius: 10,
          fontSize: 11, fontWeight: 700,
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

function NotifItem({ notif, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--white)', borderRadius: 8,
        border: '1px solid var(--slate)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        marginBottom: 8, cursor: 'pointer',
        transition: 'all 0.15s',
        ...(notif.unread ? {
          borderTop: `3px solid ${RED}`,
          background: '#fff7f7',
        } : {}),
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: notif.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: notif.iconColor }}>
          {notif.icon}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
          {notif.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, lineHeight: 1.5 }}>
          {notif.description}
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8' }}>{notif.time}</div>
      </div>
      {notif.unread && (
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: RED }}>
          check_circle
        </span>
      )}
    </div>
  );
}

function EmptyAllRead() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.4, display: 'block', marginBottom: 12 }}>
        notifications_off
      </span>
      <div style={{ fontWeight: 600, fontSize: 14 }}>You're all caught up</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>No notifications to show yet.</div>
    </div>
  );
}
