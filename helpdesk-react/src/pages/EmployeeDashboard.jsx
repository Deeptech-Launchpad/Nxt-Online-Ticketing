import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const NAVY  = '#02172E';
const RED   = '#CC3A3A';
const AMBER = '#F59E0B';
const GREEN = '#16a34a';
const BLUE  = '#0EA5E9';

/* â”€â”€ PRIORITY COLOR MAP â”€â”€ */
const PRIORITY_COLOR = {
  'Very High': RED,
  High:        RED,
  Medium:      AMBER,
  Low:         GREEN,
};
const PRIORITY_PILL = {
  High:   { color: '#ef4444', bg: '#fef2f2', border: '#fee2e2' },
  Medium: { color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
  Low:    { color: '#10b981', bg: '#ecfdf5', border: '#d1fae5' },
};
const STATUS_PILL = {
  open:          { color: '#2563eb', bg: '#eff6ff', border: '#dbeafe', label: 'OPEN' },
  'in-progress': { color: '#d97706', bg: '#fffbeb', border: '#fef3c7', label: 'IN PROGRESS' },
  resolved:      { color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7', label: 'RESOLVED' },
  closed:        { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: 'CLOSED' },
  reopened:      { color: '#6d28d9', bg: '#ede9fe', border: '#ddd6fe', label: 'REOPENED' },
};
const CATEGORY_ICON = {
  Network:  'wifi',
  Software: 'code',
  Hardware: 'computer',
  Email:    'mail',
  Printer:  'print',
};

/* â”€â”€ PLACEHOLDER MY ASSETS (real data wired in next phase) â”€â”€ */
const PLACEHOLDER_ASSETS = [
  { id: 'AST-9921', name: 'MacBook Pro 16" (M2 Max)',  icon: 'laptop' },
  { id: 'AST-8342', name: 'iPhone 14 Pro (Corporate)', icon: 'smartphone' },
  { id: 'AST-1104', name: 'Dell UltraSharp 27" 4K',    icon: 'monitor' },
];

/* â”€â”€ TIME-AGO HELPER â”€â”€ */
function timeAgo(rawDate) {
  if (!rawDate) return '';
  // rawDate from AppContext is already formatted "DD MMM YYYY, HH:mm"
  const parts = rawDate.split(',')[0]?.trim();
  return parts || rawDate;
}

/* â”€â”€ PRIORITY NORMALIZER â”€â”€ */
function normPriority(p) {
  if (!p) return 'Low';
  if (p === 'Very High') return 'High';
  return p;
}

export default function EmployeeDashboard() {
  const { currentUser, getMyTickets, fetchMyAssets } = useApp();
  const navigate = useNavigate();
  const mine = getMyTickets();
  const [realAssetCount, setRealAssetCount] = useState(null);

  // Fetch real asset count (falls back to placeholder count if empty)
  useEffect(() => {
    let cancelled = false;
    fetchMyAssets().then(rows => {
      if (cancelled) return;
      setRealAssetCount((rows && rows.length > 0) ? rows.length : PLACEHOLDER_ASSETS.length);
    });
    return () => { cancelled = true; };
  }, []);

  const openCount     = mine.filter(t => ['open', 'reopened'].includes(t.status)).length;

  // Pending Reply = tickets where the last message was from admin (employee owes a reply)
  const pendingReply  = mine.filter(t => {
    const msgs = t.messages || [];
    return msgs.length > 0 && msgs[msgs.length - 1].from === 'admin';
  }).length;

  const myAssetsCount = realAssetCount ?? PLACEHOLDER_ASSETS.length;

  // Greeting based on hour
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name?.split(' ')[0] || 'there';

  // Today's date pretty
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Recent tickets â€” top 3, newest first by id presence (already sorted from API)
  const recentTickets = mine.slice(0, 3);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* â”€â”€ HERO â”€â”€ */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #0A2540 100%)`,
        padding: '40px 44px', borderRadius: 24, marginBottom: 28,
        position: 'relative', overflow: 'hidden',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 28,
        boxShadow: '0 18px 36px rgba(2,23,46,0.18)',
      }}>
        {/* Left content */}
        <div style={{ position: 'relative', zIndex: 5, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              padding: '4px 14px', borderRadius: 20,
              fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              Employee Portal
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
              {today}
            </span>
          </div>

          <h2 style={{
            fontSize: 34, fontWeight: 800, color: '#fff',
            letterSpacing: '-1px', marginBottom: 10, lineHeight: 1.15,
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {greet}, {firstName}
          </h2>
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.7)',
            maxWidth: 460, lineHeight: 1.6, margin: 0,
          }}>
            Track your IT support requests, view assigned assets, and raise new tickets â€” all in one place.
          </p>

          {/* Glass stat tiles */}
          <div style={{ display: 'flex', gap: 14, marginTop: 26, flexWrap: 'wrap' }}>
            <GlassStat value={String(openCount).padStart(2, '0')}     label="Open Tickets" />
            <GlassStat value={String(pendingReply).padStart(2, '0')}  label="Pending Reply" />
            <GlassStat value={String(myAssetsCount).padStart(2, '0')} label="My Assets" />
          </div>
        </div>

        {/* Right CTA */}
        <div style={{ position: 'relative', zIndex: 5, flexShrink: 0 }}>
          <button
            onClick={() => navigate('/raise-ticket')}
            style={{
              padding: '16px 28px', fontSize: 15, fontWeight: 700,
              borderRadius: 16, background: RED, color: '#fff', border: '2px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 12px 28px rgba(204,58,58,0.4)',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'transform 0.18s, box-shadow 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>add_circle</span>
            Raise New Ticket
          </button>
        </div>

        {/* Decorative icon */}
        <div style={{
          position: 'absolute', right: -32, bottom: -32,
          opacity: 0.05, transform: 'rotate(-15deg)', pointerEvents: 'none',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 260, color: '#fff' }}>support_agent</span>
        </div>
      </div>

      {/* â”€â”€ TWO-COL BODY â”€â”€ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
        gap: 24,
      }}>
        {/* Recent Tickets */}
        <Section
          title="Recent Tickets"
          icon="receipt_long"
          actionLabel="View all"
          onAction={() => navigate('/history')}
        >
          {recentTickets.length === 0 ? (
            <EmptyState message="No tickets yet â€” raise your first one." />
          ) : (
            recentTickets.map(t => (
              <TicketRow key={t.id} ticket={t} onClick={() => navigate(`/tickets/${t.id}`)} />
            ))
          )}
        </Section>

        {/* My Assets â€” placeholder data */}
        <Section
          title="My Assets"
          icon="devices"
          actionLabel="View all"
          onAction={() => {}}
          subtitle="Showing placeholder data"
        >
          {PLACEHOLDER_ASSETS.map(a => (
            <AssetRow key={a.id} asset={a} />
          ))}
        </Section>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function GlassStat({ value, label }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      padding: '14px 20px', borderRadius: 16, minWidth: 130,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 4, fontFamily: 'DM Sans, sans-serif' }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {label}
      </div>
    </div>
  );
}

function Section({ title, icon, actionLabel, onAction, subtitle, children }) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 16, padding: 24,
      border: '1px solid var(--slate)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18,
      }}>
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 16, fontWeight: 700, color: '#0C0E10', fontFamily: 'DM Sans, sans-serif',
          }}>
            <span className="material-symbols-outlined" style={{ color: RED, fontSize: 22 }}>{icon}</span>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginLeft: 32 }}>
              {subtitle}
            </div>
          )}
        </div>
        {actionLabel && (
          <div
            onClick={onAction}
            style={{
              fontSize: 13, fontWeight: 600, color: RED, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {actionLabel}
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function TicketRow({ ticket, onClick }) {
  const pri = normPriority(ticket.priority);
  const barColor = PRIORITY_COLOR[pri] || GREEN;
  const priStyle = PRIORITY_PILL[pri] || PRIORITY_PILL.Low;
  const stStyle  = STATUS_PILL[ticket.status] || STATUS_PILL.open;
  const catIcon  = CATEGORY_ICON[ticket.category] || 'category';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 0', borderBottom: '1px solid #f1f5f9',
        display: 'flex', gap: 14, cursor: 'pointer',
        transition: 'transform 0.18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ width: 3, borderRadius: 4, background: barColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          #{ticket.id}
        </div>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#0C0E10', marginBottom: 5,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {ticket.subject}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{catIcon}</span>
          {ticket.category || 'General'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <Pill {...priStyle}>{pri.toUpperCase()}</Pill>
        <Pill {...stStyle}>{stStyle.label}</Pill>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(ticket.createdAt)}</span>
      </div>
    </div>
  );
}

function Pill({ color, bg, border, children }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      color, background: bg, border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function AssetRow({ asset }) {
  return (
    <div style={{
      padding: 14, border: '1px solid #f1f5f9', borderRadius: 12,
      marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14,
      transition: 'all 0.18s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.background = '#fff7f7'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 42, height: 42, background: '#f8fafc',
        border: '1px solid #f1f5f9', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: RED,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{asset.icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0C0E10' }}>{asset.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{asset.id}</div>
      </div>
      <span style={{
        background: '#f0fdf4', color: '#16a34a',
        padding: '4px 10px', borderRadius: 6,
        fontSize: 10, fontWeight: 700, border: '1px solid #dcfce7',
      }}>
        ACTIVE
      </span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{
      textAlign: 'center', padding: '40px 20px',
      color: 'var(--text-muted)', fontSize: 14,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.4, display: 'block', marginBottom: 8 }}>
        inbox
      </span>
      {message}
    </div>
  );
}
