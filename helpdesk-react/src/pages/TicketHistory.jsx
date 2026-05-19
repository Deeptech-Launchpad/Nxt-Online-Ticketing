import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const RED   = '#CC3A3A';
const NAVY  = '#02172E';
const AMBER = '#F59E0B';
const GREEN = '#16a34a';

const PRIORITY_BAR = {
  'Very High': RED,
  High:        RED,
  Medium:      AMBER,
  Low:         GREEN,
};

const PRIORITY_PILL = {
  'Very High': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'HIGH' },
  High:        { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'HIGH' },
  Medium:      { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'MEDIUM' },
  Low:         { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'LOW' },
};

const STATUS_PILL = {
  open:          { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'OPEN' },
  'in-progress': { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'IN PROGRESS' },
  resolved:      { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'RESOLVED' },
  closed:        { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', label: 'CLOSED' },
  reopened:      { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe', label: 'REOPENED' },
};

const CATEGORY_ICON = {
  Network:  'wifi',
  Software: 'code',
  Hardware: 'computer',
  Email:    'mail',
  Printer:  'print',
  'Access / Login': 'lock',
  Other:    'more_horiz',
};

const FILTERS = [
  { id: 'all',         label: 'All' },
  { id: 'open',        label: 'Open' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'resolved',    label: 'Resolved' },
];

export default function TicketHistory() {
  const navigate = useNavigate();
  const { getMyTickets } = useApp();
  const [filter, setFilter] = useState('all');

  const mine = getMyTickets();

  const counts = {
    all:           mine.length,
    open:          mine.filter(t => ['open', 'reopened'].includes(t.status)).length,
    'in-progress': mine.filter(t => t.status === 'in-progress').length,
    resolved:      mine.filter(t => ['resolved', 'closed'].includes(t.status)).length,
  };

  const visible = mine.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'open') return ['open', 'reopened'].includes(t.status);
    if (filter === 'resolved') return ['resolved', 'closed'].includes(t.status);
    return t.status === filter;
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <h1 style={{
          fontSize: 27, fontWeight: 700, color: NAVY,
          letterSpacing: '-0.6px', fontFamily: 'DM Sans, sans-serif',
        }}>
          My Tickets
        </h1>
        <button
          onClick={() => navigate('/raise-ticket')}
          style={{
            padding: '12px 22px', fontSize: 14, fontWeight: 700,
            borderRadius: 12, background: RED, color: '#fff', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 6px 16px rgba(204,58,58,0.25)',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
          Raise New Ticket
        </button>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <FilterTab
            key={f.id}
            label={f.label}
            count={counts[f.id]}
            active={filter === f.id}
            onClick={() => setFilter(f.id)}
          />
        ))}
      </div>

      {/* TICKETS LIST */}
      {visible.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(t => (
            <TicketCard
              key={t.id}
              ticket={t}
              onClick={() => navigate(`/tickets/${t.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({ label, count, active, onClick }) {
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
      <span style={{
        fontSize: 11, fontWeight: 700,
        background: active ? 'rgba(255,255,255,0.25)' : 'transparent',
        padding: active ? '1px 6px' : 0,
        borderRadius: 10,
        opacity: active ? 1 : 0.7,
      }}>
        {count}
      </span>
    </div>
  );
}

function TicketCard({ ticket, onClick }) {
  const pri = ticket.priority || 'Low';
  const barColor = PRIORITY_BAR[pri] || GREEN;
  const priStyle = PRIORITY_PILL[pri] || PRIORITY_PILL.Low;
  const stStyle  = STATUS_PILL[ticket.status] || STATUS_PILL.open;
  const catIcon  = CATEGORY_ICON[ticket.category] || 'category';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--white)', borderRadius: 10,
        border: '1px solid var(--slate)',
        boxShadow: 'var(--shadow-sm)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 20,
        cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        transition: 'all 0.18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Left priority bar */}
      <div style={{
        position: 'absolute', left: 0, top: 14, bottom: 14, width: 3,
        borderRadius: 4, background: barColor,
      }} />

      {/* Main */}
      <div style={{ flex: 1, paddingLeft: 8, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'DM Mono, monospace' }}>
          #{ticket.id}
        </div>
        <div style={{
          fontWeight: 600, fontSize: 14, marginBottom: 6,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {ticket.subject}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{catIcon}</span>
          {ticket.category || 'General'}
          <span>·</span>
          <span>Created {ticket.createdAt}</span>
        </div>
      </div>

      {/* Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Pill {...priStyle}>{priStyle.label}</Pill>
          <Pill {...stStyle}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: stStyle.color, display: 'inline-block', marginRight: 4 }} />
            {stStyle.label}
          </Pill>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          style={{
            background: 'var(--white)', color: 'var(--text-primary)',
            border: '1px solid var(--slate)', borderRadius: 8,
            padding: '6px 14px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--slate)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        >
          View Details
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

function Pill({ bg, color, border, children }) {
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 20,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      color, background: bg, border: `1px solid ${border}`,
      whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center',
    }}>
      {children}
    </span>
  );
}

function EmptyState({ filter }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 24px',
      background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate)',
    }}>
      <span className="material-symbols-outlined" style={{
        fontSize: 56, color: 'var(--text-muted)', opacity: 0.4, display: 'block', marginBottom: 14,
      }}>
        inbox
      </span>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        No {filter === 'all' ? '' : filter} tickets
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        {filter === 'all' ? "You haven't raised any tickets yet." : 'Nothing in this category right now.'}
      </div>
    </div>
  );
}
