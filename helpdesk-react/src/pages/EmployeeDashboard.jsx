import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ICON_MAP = { Network: 'wifi_off', Software: 'terminal', Hardware: 'devices', Email: 'mail', Printer: 'print' };

const ICON_BG_STYLE = {
  Network:  { background: 'rgba(204,58,58,0.1)',   color: '#CC3A3A' },
  Software: { background: 'rgba(37,99,235,0.1)',   color: '#2563eb' },
  Hardware: { background: 'rgba(2,23,46,0.08)',    color: '#02172E' },
  Email:    { background: 'rgba(149,191,71,0.12)', color: '#95BF47' },
  Printer:  { background: 'rgba(2,23,46,0.08)',    color: '#02172E' },
};

const PRIORITY_STYLE = {
  'Very High': { background: '#fdecea', color: '#CC3A3A' },
  High:        { background: '#fdecea', color: '#CC3A3A' },
  Medium:      { background: 'rgba(37,99,235,0.1)', color: '#2563eb' },
  Low:         { background: '#f1f5f9', color: '#475569' },
};

function TicketCard({ ticket, onClick }) {
  const icon   = ICON_MAP[ticket.category] || 'confirmation_number';
  const iconBg = ICON_BG_STYLE[ticket.category] || { background: 'rgba(2,23,46,0.08)', color: '#02172E' };
  const pStyle = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.Low;

  let dotColor = '#95BF47', statusLabel = 'Resolved';
  if (ticket.status === 'open')        { dotColor = '#CC3A3A'; statusLabel = 'Open'; }
  else if (ticket.status === 'reopened') { dotColor = '#6d28d9'; statusLabel = 'Reopened'; }
  else if (ticket.status === 'in-progress') { dotColor = '#2563eb'; statusLabel = 'In Progress'; }

  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px',
        borderRadius: 12, transition: 'background 0.15s, box-shadow 0.15s',
        border: `1px solid ${hovered ? 'var(--slate)' : 'transparent'}`,
        background: hovered ? 'var(--off-white)' : 'transparent',
        boxShadow: hovered ? 'var(--shadow-sm)' : 'none',
      }}
    >
      {/* Ticket ID */}
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700,
        color: 'var(--blue)', background: 'var(--blue-pale)',
        padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap', minWidth: 80, textAlign: 'center',
      }}>
        #{ticket.id}
      </span>

      {/* Category Icon */}
      <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...iconBg }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
      </div>

      {/* Subject + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#0C0E10', fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ticket.subject}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ background: 'var(--off-white)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {ticket.category}
          </span>
          <span style={{ color: 'var(--slate)' }}>•</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ticket.createdAt}</span>
        </div>
      </div>

      {/* Priority + Status + Arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <span style={{ ...pStyle, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {ticket.priority}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: dotColor }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
          {statusLabel}
        </span>
        <span className="material-symbols-outlined" style={{ color: '#CC3A3A', fontSize: 20 }}>arrow_forward</span>
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const { currentUser, getMyTickets } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const mine  = getMyTickets();
  const total = mine.length;
  const open  = mine.filter(t => ['open', 'reopened'].includes(t.status)).length;
  const prog  = mine.filter(t => t.status === 'in-progress').length;
  const res   = mine.filter(t => ['resolved', 'closed'].includes(t.status)).length;

  let visible = mine;
  if (filter === 'open')        visible = mine.filter(t => ['open', 'reopened'].includes(t.status));
  if (filter === 'in-progress') visible = mine.filter(t => t.status === 'in-progress');
  if (filter === 'closed')      visible = mine.filter(t => ['resolved', 'closed'].includes(t.status));

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  const STATS = [
    { filterId: 'all',         label: 'Total Raised', value: total, sub: 'All time raised',   icon: 'layers',      color: '#02172E', bg: 'rgba(2,23,46,0.08)',    valueColor: '#02172E' },
    { filterId: 'open',        label: 'Open',         value: open,  sub: 'Awaiting action',   icon: 'pending',     color: '#CC3A3A', bg: 'rgba(204,58,58,0.1)',   valueColor: '#CC3A3A' },
    { filterId: 'in-progress', label: 'In Progress',  value: prog,  sub: 'Being worked on',   icon: 'sync',        color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   valueColor: '#2563eb' },
    { filterId: 'closed',      label: 'Resolved',     value: res,   sub: 'Successfully closed', icon: 'task_alt', color: '#95BF47', bg: 'rgba(149,191,71,0.12)', valueColor: '#95BF47' },
  ];

  return (
    <div className="page-fade">

      {/* ── Welcome Banner ── */}
      <div style={{
        position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 24,
        background: 'linear-gradient(120deg, #02172E 0%, #021a38 42%, #02172E 68%, #CC3A3A 100%)',
        boxShadow: '0 8px 32px rgba(31,36,72,0.2)', minHeight: 152,
      }}>
        {/* Decorative blobs */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.12, pointerEvents: 'none' }} viewBox="0 0 900 152" preserveAspectRatio="xMidYMid slice">
          <circle cx="830" cy="-30" r="170" fill="#fff" />
          <circle cx="700" cy="180" r="130" fill="#CC3A3A" />
          <circle cx="80"  cy="170" r="110" fill="#fff" />
          <circle cx="290" cy="-50" r="95"  fill="#CC3A3A" />
          <circle cx="510" cy="76"  r="62"  fill="#fff" />
        </svg>
        {/* Dot grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, pointerEvents: 'none' }}>
          <defs>
            <pattern id="edots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.5" fill="#fff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#edots)" />
        </svg>

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 2, padding: '28px 36px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 24, flexWrap: 'wrap',
        }}>
          {/* Left — Avatar + Greeting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 62, height: 62, borderRadius: '50%',
              background: 'linear-gradient(135deg, #CC3A3A 0%, #02172E 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff',
              boxShadow: '0 4px 18px rgba(0,0,0,0.28)', flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.2)',
              fontFamily: 'Manrope, sans-serif',
            }}>
              {(currentUser?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.48)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 5 }}>
                {today}
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', fontFamily: 'Manrope, sans-serif', margin: 0, lineHeight: 1.15 }}>
                Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}
              </h2>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500, marginTop: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                {currentUser?.division}{currentUser?.dept ? ' · ' + currentUser.dept : ''}
              </div>
            </div>
          </div>

          {/* Right — CTA */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/raise-ticket')}
              style={{
                background: '#CC3A3A', color: '#fff', border: 'none', borderRadius: 12,
                padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: '0 4px 14px rgba(204,58,58,0.4)',
                fontFamily: 'Inter, sans-serif',
                transition: 'background 0.15s, transform 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#a82e2e'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#CC3A3A'; e.currentTarget.style.transform = 'none'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
              Raise a Ticket
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {STATS.map((s, i) => (
          <div
            key={i}
            onClick={() => setFilter(s.filterId)}
            style={{
              background: 'var(--white)', borderRadius: 14,
              border: filter === s.filterId ? `1.5px solid ${s.color}` : '1px solid var(--slate)', padding: '16px 18px',
              display: 'flex', flexDirection: 'column', gap: 10,
              transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'pointer',
              boxShadow: filter === s.filterId ? `0 4px 18px ${s.color}20` : 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 19, color: s.color }}>{s.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.valueColor, letterSpacing: '-1px', fontFamily: 'Manrope, sans-serif', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 5 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {s.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Ticket List ── */}
      <div style={{ background: 'var(--white)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--slate)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--slate)', gap: 12 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: '#0C0E10', margin: 0 }}>My Tickets</h3>
          <div style={{ display: 'flex', background: 'var(--off-white)', borderRadius: 10, padding: 4, gap: 4, border: '1px solid var(--slate)' }}>
            {['all', 'open', 'in-progress', 'closed'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                background: filter === f ? 'var(--white)' : 'transparent',
                color: filter === f ? 'var(--blue-light)' : 'var(--text-muted)',
                boxShadow: filter === f ? 'var(--shadow-sm)' : 'none',
              }}>
                {f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '8px 16px' }}>
          {visible.length === 0
            ? <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontWeight: 500 }}>No tickets found.</div>
            : visible.map(t => (
              <TicketCard key={t.id} ticket={t} onClick={() => navigate(`/tickets/${t.id}`)} />
            ))
          }
        </div>

        <div style={{ borderTop: '1px solid var(--slate)', padding: '14px 24px', textAlign: 'center' }}>
          <button onClick={() => navigate('/history')} style={{
            fontSize: 13.5, fontWeight: 700, color: 'var(--blue-light)',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: 'Inter, sans-serif',
          }}>
            View All Activity
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
          </button>
        </div>
      </div>
    </div>
  );
}
