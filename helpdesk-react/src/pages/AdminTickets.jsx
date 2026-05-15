import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { showToast } from '../components/Toast';
import { downloadCSV, todayStamp } from '../utils/csv';

const NAVY  = '#02172E';
const RED   = '#CC3A3A';
const AMBER = '#F59E0B';
const GREEN = '#16a34a';

const PRI_PILL = {
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

function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(',', ''));
  if (isNaN(d)) return iso;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)        return `${diff}s ago`;
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AdminTickets() {
  const { tickets, currentUser, assignTicket, setStatus } = useApp();
  const navigate = useNavigate();

  const [search,    setSearch]    = useState('');
  const [fStatus,   setFStatus]   = useState('all');
  const [fPriority, setFPriority] = useState('all');

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (search) {
        const s = search.toLowerCase();
        if (!t.subject.toLowerCase().includes(s) &&
            !(t.employeeName || '').toLowerCase().includes(s) &&
            !t.id.toLowerCase().includes(s)) return false;
      }
      if (fStatus !== 'all') {
        if (fStatus === 'Open' && !['open', 'reopened'].includes(t.status)) return false;
        if (fStatus === 'In Progress' && t.status !== 'in-progress') return false;
        if (fStatus === 'Resolved' && !['resolved', 'closed'].includes(t.status)) return false;
      }

      // Priority handling:
      //  - Default view ('all'): HIDE High + Very High (they live in the urgent banner above)
      //  - Filter 'HIGH'  : show only High + Very High (override default hiding)
      //  - Filter 'MEDIUM'/'LOW': show only that priority
      if (fPriority === 'all') {
        if (['High', 'Very High'].includes(t.priority)) return false;
      } else if (fPriority === 'HIGH') {
        if (!['High', 'Very High'].includes(t.priority)) return false;
      } else if (fPriority === 'MEDIUM') {
        if (t.priority !== 'Medium') return false;
      } else if (fPriority === 'LOW') {
        if (t.priority !== 'Low') return false;
      }
      return true;
    });
  }, [tickets, search, fStatus, fPriority]);

  // Urgent tickets shown in the banner above the table â€” High + Very High unresolved
  const urgent = useMemo(() => {
    return tickets
      .filter(t => ['High', 'Very High'].includes(t.priority) && ['open', 'reopened'].includes(t.status))
      .slice(0, 3);
  }, [tickets]);

  /* â”€â”€ Actions â”€â”€ */
  const claimTicket = async (t) => {
    if (!currentUser) return;
    await assignTicket(t.id, currentUser.name);
    await setStatus(t.id, 'in-progress');
    showToast(`Claimed ${t.id}`, 'success');
  };

  const reopenTicket = async (t) => {
    await setStatus(t.id, 'in-progress');
    showToast(`Reopened ${t.id}`, 'success');
  };

  const exportCSV = () => {
    const rows = filtered.map(t => ({
      'Ticket ID':     t.id,
      'Subject':       t.subject,
      'Category':      t.category || '',
      'Employee Name': t.employeeName || '',
      'Employee ID':   t.employeeId || '',
      'Department':    t.dept || '',
      'Division':      t.division || '',
      'Priority':      t.priority || '',
      'Status':        t.status || '',
      'Assigned To':   t.assignedTo || '',
      'Created At':    t.createdAt || '',
      'Updated At':    t.updatedAt || '',
      'Resolved At':   t.resolvedAt || '',
      'Description':   t.desc || '',
      'Resolution':    t.resolutionNote || '',
    }));
    downloadCSV(`tickets-${todayStamp()}.csv`, rows);
    showToast(`Exported ${rows.length} ticket${rows.length === 1 ? '' : 's'}`, 'success');
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 27, fontWeight: 700, color: NAVY, letterSpacing: '-0.6px', fontFamily: 'DM Sans, sans-serif' }}>
            All Tickets
          </h1>
          <span style={{
            background: 'rgba(204,58,58,0.1)', color: RED, fontWeight: 700,
            padding: '3px 10px', borderRadius: 10, fontSize: 12,
          }}>
            {tickets.length}
          </span>
        </div>
        <button
          onClick={exportCSV}
          style={{
            padding: '10px 18px', background: 'var(--white)',
            border: '1px solid var(--slate)', borderRadius: 8,
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>file_download</span>
          Export
        </button>
      </div>

      {/* URGENT BANNER */}
      {urgent.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 13, fontWeight: 800, color: NAVY,
            marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <div style={{ width: 8, height: 8, background: RED, borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            Urgent Tickets â€” Require Immediate Response
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {urgent.map(t => (
              <div key={t.id} style={{
                background: '#fef2f2', border: '1px solid rgba(204,58,58,0.15)',
                borderRadius: 12, padding: '14px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: `linear-gradient(135deg, ${RED}, ${NAVY})`, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13,
                }}>
                  {(t.employeeName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>
                    {t.employeeName} â€” {t.subject}
                  </div>
                  <div style={{ fontSize: 11, color: RED, fontWeight: 600, marginTop: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12, verticalAlign: 'middle' }}>schedule</span>{' '}
                    {relTime(t.createdAt)} elapsed Â· {t.division}
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px', background: '#fef2f2', color: '#dc2626',
                  border: '1px solid #fecaca', borderRadius: 20,
                  fontSize: 10, fontWeight: 700,
                }}>HIGH</span>
                <button
                  onClick={() => navigate(`/admin/tickets/${t.id}`)}
                  style={{
                    height: 36, padding: '0 16px', borderRadius: 8,
                    background: RED, color: '#fff', border: 'none',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Respond
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24,
        background: '#f8fafc', padding: 12, borderRadius: 14,
        border: '1px solid var(--slate)',
      }}>
        <div style={{
          flex: 1, background: 'var(--white)', border: '1px solid var(--slate)',
          borderRadius: 10, padding: '0 14px', height: 40,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)' }}>search</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by ticket ID, employee, issue..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'inherit', fontSize: 13, color: 'var(--text-primary)',
            }}
          />
        </div>
        <select
          value={fStatus} onChange={e => setFStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select
          value={fPriority} onChange={e => setFPriority(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>
      </div>

      {/* TICKETS TABLE */}
      <div style={{
        background: 'var(--white)', borderRadius: 16,
        border: '1px solid var(--slate)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.4, display: 'block', marginBottom: 12 }}>inbox</span>
            No tickets match your filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--slate)' }}>
                <Th>Ticket ID</Th>
                <Th>Employee</Th>
                <Th>Issue</Th>
                <Th>Device</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th>Date</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <Row
                  key={t.id}
                  ticket={t}
                  onView={() => navigate(`/admin/tickets/${t.id}`)}
                  onClaim={() => claimTicket(t)}
                  onReopen={() => reopenTicket(t)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin-slow { animation: spin-slow 2s linear infinite; }
      `}</style>
    </div>
  );
}

function Th({ children }) {
  return (
    <th style={{
      padding: '14px 20px', fontSize: 11, fontWeight: 800,
      color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
      textAlign: 'left',
    }}>
      {children}
    </th>
  );
}

function Row({ ticket, onView, onClaim, onReopen }) {
  const pri = PRI_PILL[ticket.priority] || PRI_PILL.Low;
  const st  = STATUS_PILL[ticket.status] || STATUS_PILL.open;

  const isOpen     = ['open', 'reopened'].includes(ticket.status);
  const isInProg   = ticket.status === 'in-progress';
  const isResolved = ['resolved', 'closed'].includes(ticket.status);

  return (
    <tr
      onClick={onView}
      style={{ cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#fafafa'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <td style={tdStyle}>
        <span style={{ color: RED, fontWeight: 600, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
          {ticket.id}
        </span>
      </td>
      <td style={tdStyle}>
        <div style={{ fontWeight: 600 }}>{ticket.employeeName}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ticket.dept || ticket.division}</div>
      </td>
      <td style={{ ...tdStyle, maxWidth: 280 }}>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ticket.subject}
        </div>
      </td>
      <td style={tdStyle}>{ticket.device || 'â€”'}</td>
      <td style={tdStyle}>
        <span style={{
          padding: '4px 10px', borderRadius: 20,
          fontSize: 10, fontWeight: 700,
          background: pri.bg, color: pri.color, border: `1px solid ${pri.border}`,
        }}>
          {pri.label}
        </span>
      </td>
      <td style={tdStyle}>
        <span style={{
          padding: '4px 10px', borderRadius: 20,
          fontSize: 10, fontWeight: 700,
          background: st.bg, color: st.color, border: `1px solid ${st.border}`,
        }}>
          {st.label}
        </span>
      </td>
      <td style={tdStyle}>{ticket.createdAt?.split(',')[0] || 'â€”'}</td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Eye icon â€” always visible */}
          <button
            onClick={e => { e.stopPropagation(); onView(); }}
            title="View details"
            style={{
              width: 30, height: 30, borderRadius: 6,
              border: '1px solid var(--slate)', background: 'var(--white)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--text-muted)' }}>visibility</span>
          </button>

          {/* Status-specific action */}
          {isOpen && (
            <button
              onClick={e => { e.stopPropagation(); onClaim(); }}
              style={{
                height: 30, padding: '0 12px', borderRadius: 6,
                background: RED, color: '#fff', border: 'none',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Claim
            </button>
          )}

          {isInProg && (
            <div style={{
              height: 30, padding: '0 10px', borderRadius: 6,
              background: '#fffbeb', border: '1px solid #fde68a',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 700, color: '#d97706',
            }}>
              <span className="material-symbols-outlined spin-slow" style={{ fontSize: 13 }}>sync</span>
              Processing
            </div>
          )}

          {isResolved && (
            <button
              onClick={e => { e.stopPropagation(); onReopen(); }}
              style={{
                height: 30, padding: '0 10px', borderRadius: 6,
                background: 'var(--white)', color: RED, border: `1px solid ${RED}`,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>refresh</span>
              Reopen
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

const tdStyle = {
  padding: '16px 20px', borderBottom: '1px solid var(--slate)',
  fontSize: 13, color: 'var(--text-primary)',
};

const selectStyle = {
  width: 160, height: 40,
  background: 'var(--white)', border: '1px solid var(--slate)',
  borderRadius: 10, padding: '0 12px',
  fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
  cursor: 'pointer', outline: 'none',
};
