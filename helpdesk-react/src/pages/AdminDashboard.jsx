import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { showToast } from '../components/Toast';

const NAVY  = '#02172E';
const RED   = '#CC3A3A';
const AMBER = '#F59E0B';
const GREEN = '#16a34a';
const BLUE  = '#0EA5E9';

/* â”€â”€ Priority color map â”€â”€ */
const PRI_BAR = { 'Very High': RED, High: RED, Medium: AMBER, Low: GREEN };
const PRI_PILL = {
  'Very High': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'HIGH' },
  High:        { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'HIGH' },
  Medium:      { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'MEDIUM' },
  Low:         { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'LOW' },
};

const CAT_ICON = {
  Network: 'wifi', Software: 'code', Hardware: 'computer', Email: 'mail',
  Printer: 'print', 'Access / Login': 'lock', Other: 'more_horiz',
};

/* Pretty relative time */
function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(',', ''));
  if (isNaN(d)) return iso;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)        return `${diff}s ago`;
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AdminDashboard() {
  const { currentUser, tickets, assignTicket, setStatus } = useApp();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [feedFilter, setFeedFilter] = useState('all');

  /* â”€â”€ Stats â”€â”€ */
  const totalCount    = tickets.length;
  const inProgCount   = tickets.filter(t => t.status === 'in-progress').length;
  const resolvedCount = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;
  const highPriCount  = tickets.filter(t => ['High', 'Very High'].includes(t.priority) && !['resolved', 'closed'].includes(t.status)).length;
  const openCount     = tickets.filter(t => ['open', 'reopened'].includes(t.status)).length;

  /* â”€â”€ Critical alert: oldest Very-High unresolved ticket â”€â”€ */
  const criticalTicket = useMemo(() => {
    return tickets
      .filter(t => t.priority === 'Very High' && ['open', 'reopened'].includes(t.status))
      .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))[0];
  }, [tickets]);

  /* â”€â”€ Recent ticket feed â”€â”€ */
  const feedTickets = useMemo(() => {
    const sorted = [...tickets].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (feedFilter === 'all') return sorted.slice(0, 5);
    if (feedFilter === 'Open')        return sorted.filter(t => ['open', 'reopened'].includes(t.status)).slice(0, 5);
    if (feedFilter === 'In Progress') return sorted.filter(t => t.status === 'in-progress').slice(0, 5);
    if (feedFilter === 'Resolved')    return sorted.filter(t => ['resolved', 'closed'].includes(t.status)).slice(0, 5);
    return sorted.slice(0, 5);
  }, [tickets, feedFilter]);

  /* â”€â”€ Health radar derivation â”€â”€ */
  const overallHealth = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;
  const hwTotal       = tickets.filter(t => t.category === 'Hardware').length;
  const hwResolved    = tickets.filter(t => t.category === 'Hardware' && ['resolved', 'closed'].includes(t.status)).length;
  const hwStability   = hwTotal > 0 ? Math.round((hwResolved / hwTotal) * 100) : 100;

  const claimTicket = async (t) => {
    if (!currentUser) return;
    await assignTicket(t.id, currentUser.name);
    await setStatus(t.id, 'in-progress');
    showToast(`Claimed ${t.id}`, 'success');
  };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* â”€â”€ QUICK SHORTCUT BAR â”€â”€ */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <ShortcutBtn icon="add_circle" iconColor={GREEN} label="New Asset"       onClick={() => navigate('/admin/assets')} />
        <ShortcutBtn icon="person_add" iconColor={BLUE}  label="Assign Device"   onClick={() => navigate('/admin/assign-device')} />
        <ShortcutBtn icon="people"     iconColor={AMBER} label="All Personnel"   onClick={() => navigate('/admin/employees')} />
        <ShortcutBtn icon="dark_mode"  iconColor="#64748B" label="Toggle Theme"  onClick={toggleTheme} />
      </div>

      {/* â”€â”€ CRITICAL ALERT BANNER â”€â”€ */}
      {criticalTicket && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderLeft: `4px solid ${RED}`,
          padding: '16px 24px', borderRadius: 12, marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(239,68,68,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ color: RED, animation: 'pulse 2s infinite' }}>warning</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: RED, display: 'flex', alignItems: 'center', gap: 8 }}>
                CRITICAL: VERY HIGH PRIORITY TICKET
                <span style={{ background: RED, color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4 }}>HIGH RISK</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {criticalTicket.employeeName} - <strong>{criticalTicket.subject}</strong> · created {relTime(criticalTicket.createdAt)}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/admin/tickets/${criticalTicket.id}`)}
            style={{
              padding: '10px 20px', fontSize: 12, fontWeight: 700,
              background: RED, color: '#fff', border: 'none', borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Investigate Now
          </button>
        </div>
      )}

      {/* â”€â”€ HERO â”€â”€ */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #0a2540 100%)`,
        padding: 48, borderRadius: 28, marginBottom: 36,
        position: 'relative', overflow: 'hidden',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 20px 50px rgba(2, 23, 46, 0.2)',
      }}>
        <div style={{ position: 'relative', zIndex: 5, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              padding: '4px 14px', borderRadius: 20,
              fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              Command Center
            </span>
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600 }}>
              <span style={{
                width: 8, height: 8, background: '#10b981', borderRadius: '50%',
                display: 'inline-block', marginRight: 8,
                boxShadow: '0 0 12px #10b981',
                animation: 'pulse 2s infinite',
              }} />
              SYSTEM LIVE
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginLeft: 'auto' }}>
              {today}
            </span>
          </div>
          <h2 style={{
            fontSize: 38, fontWeight: 800, color: '#fff',
            letterSpacing: '-1.2px', marginBottom: 12, lineHeight: 1.1,
            fontFamily: 'DM Sans, sans-serif',
          }}>
            Workspace Overview
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', maxWidth: 480, lineHeight: 1.6, margin: 0 }}>
            Welcome back, <span style={{ color: '#fff', fontWeight: 700 }}>{currentUser?.name || 'Administrator'}</span>.
            {criticalTicket
              ? ' You have critical system alerts that require your immediate attention.'
              : ' All systems are running smoothly today.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 14, flexShrink: 0, position: 'relative', zIndex: 5 }}>
          <GlassStat value={String(highPriCount).padStart(2, '0')} label="Critical Alerts" />
          <GlassStat value={String(openCount).padStart(2, '0')}    label="Open Tickets" />
        </div>

        {/* Decorative icon */}
        <div style={{
          position: 'absolute', right: -40, bottom: -40,
          opacity: 0.04, transform: 'rotate(-15deg)', pointerEvents: 'none',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 300, color: '#fff' }}>security</span>
        </div>
      </div>

      {/* â”€â”€ STATS GRID (4 cards with health bars) â”€â”€ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard icon="assignment"     iconColor={RED}   value={totalCount}    label="Total Tickets"  trend="Overall volume"   trendIcon="trending_up" pct={100} />
        <StatCard icon="pending_actions" iconColor={BLUE}  value={inProgCount}   label="In Progress"    trend="Active resolution" trendIcon="bolt"        pct={totalCount > 0 ? Math.round((inProgCount / totalCount) * 100) : 0} />
        <StatCard icon="task_alt"        iconColor={RED}   value={resolvedCount} label="Resolved"       trend="Total resolved"    trendIcon="check_circle" pct={totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0} />
        <StatCard icon="priority_high"   iconColor={AMBER} value={highPriCount}  label="High Priority"  trend="Urgent attention"  trendIcon="speed"        pct={totalCount > 0 ? Math.round((highPriCount / totalCount) * 100) : 0} />
      </div>

      {/* â”€â”€ BODY GRID: feed left, health radar right â”€â”€ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 32 }}>
        {/* RECENT TICKETS FEED */}
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{
            padding: 24, borderBottom: '1px solid var(--slate)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 18, color: NAVY, letterSpacing: '-0.5px', fontFamily: 'DM Sans, sans-serif' }}>
                Recent Tickets
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Real-time monitoring of workplace incidents
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'Open', 'In Progress', 'Resolved'].map(f => (
                <FilterTab key={f} label={f === 'all' ? 'All' : f} active={feedFilter === f} onClick={() => setFeedFilter(f)} />
              ))}
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {feedTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                No tickets match this filter.
              </div>
            ) : (
              feedTickets.map(t => (
                <FeedRow
                  key={t.id}
                  ticket={t}
                  onView={() => navigate(`/admin/tickets/${t.id}`)}
                  onClaim={() => claimTicket(t)}
                />
              ))
            )}
          </div>

          <div style={{ padding: 18, borderTop: '1px solid var(--slate)', textAlign: 'center' }}>
            <a
              onClick={() => navigate('/admin/tickets')}
              style={{
                fontSize: 13, color: RED, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              Go to Ticket Center <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </a>
          </div>
        </div>

        {/* HEALTH RADAR */}
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate)', boxShadow: 'var(--shadow-sm)', padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: NAVY, letterSpacing: '-0.5px', fontFamily: 'DM Sans, sans-serif' }}>
              Health Radar
            </h3>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(204,58,58,0.1)', color: RED,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined">analytics</span>
            </div>
          </div>

          <RadialGauge value={overallHealth} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            <RadarRow color={RED}   label="Hardware Stability" value={`${hwStability}%`} />
          </div>

          <button
            onClick={() => navigate('/admin/reports')}
            style={{
              width: '100%', marginTop: 24, padding: 14, borderRadius: 12,
              background: NAVY, color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
            }}
          >
            View System Reports
          </button>
        </div>
      </div>

      {/* keyframes */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ COMPONENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function ShortcutBtn({ icon, iconColor, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--white)', border: '1px solid var(--slate)',
        borderRadius: 12, padding: '10px 20px',
        fontWeight: 700, fontSize: 13, color: NAVY, cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)', transition: 'all 0.18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = RED; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--slate)'; }}
    >
      <span className="material-symbols-outlined" style={{ color: iconColor }}>{icon}</span>
      {label}
    </button>
  );
}

function GlassStat({ value, label }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      padding: '20px 24px', borderRadius: 20, minWidth: 160,
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 4, fontFamily: 'DM Sans, sans-serif' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {label}
      </div>
    </div>
  );
}

function StatCard({ icon, iconColor, value, label, trend, trendIcon, pct }) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 16,
      border: '1px solid var(--slate)', padding: 24,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: `${iconColor}1a`, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: NAVY, fontFamily: 'DM Sans, sans-serif' }}>{value}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
        </div>
      </div>
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: iconColor, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
      <div style={{ fontSize: 11, color: iconColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{trendIcon}</span>
        {trend}
      </div>
    </div>
  );
}

function FilterTab({ label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
        cursor: 'pointer', border: '1px solid var(--slate)',
        background: active ? RED : 'var(--white)',
        color: active ? '#fff' : 'var(--text-muted)',
        boxShadow: active ? '0 4px 12px rgba(204,58,58,0.25)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </div>
  );
}

function FeedRow({ ticket, onView, onClaim }) {
  const pri = ticket.priority || 'Low';
  const barColor = PRI_BAR[pri] || GREEN;
  const priStyle = PRI_PILL[pri] || PRI_PILL.Low;
  const catIcon  = CAT_ICON[ticket.category] || 'category';
  const status   = ticket.status;

  const initials = (ticket.employeeName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const isResolved = ['resolved', 'closed'].includes(status);
  const isInProg   = status === 'in-progress';

  return (
    <div
      onClick={e => { if (!e.target.closest('button')) onView(); }}
      style={{
        padding: '16px 20px', borderRadius: 12,
        background: 'var(--off-white)', border: '1px solid var(--slate)',
        borderLeft: `4px solid ${barColor}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 12, opacity: isResolved ? 0.8 : 1,
        transition: 'all 0.18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `linear-gradient(135deg, ${RED}, ${NAVY})`,
        color: '#fff', fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif',
        flexShrink: 0,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>{ticket.employeeName || 'Unknown'}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{relTime(ticket.createdAt)}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: barColor }}>{catIcon}</span>
          {ticket.subject}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            padding: '1px 8px', borderRadius: 4,
            fontSize: 9, fontWeight: 700,
            background: priStyle.bg, color: priStyle.color, border: `1px solid ${priStyle.border}`,
          }}>
            {priStyle.label}
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{ticket.category || 'General'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={e => { e.stopPropagation(); onView(); }}
          style={{
            width: 36, height: 36, padding: 0, borderRadius: 8,
            background: 'transparent', border: '1px solid var(--slate)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)' }}>visibility</span>
        </button>
        {isResolved ? (
          <button
            onClick={e => { e.stopPropagation(); onView(); }}
            style={{
              height: 36, padding: '0 16px', borderRadius: 8,
              background: RED, color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Reopen
          </button>
        ) : isInProg ? (
          <div style={{
            height: 36, display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, fontSize: 11, fontWeight: 700, color: RED,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync</span> Processing
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onClaim(); }}
            style={{
              height: 36, padding: '0 16px', borderRadius: 8,
              background: RED, color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Claim
          </button>
        )}
      </div>
    </div>
  );
}

function RadialGauge({ value }) {
  // Simple visual approximation using border trick - not full SVG arc
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28, position: 'relative' }}>
      <div style={{
        width: 140, height: 140, borderRadius: '50%',
        border: '12px solid var(--slate)',
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: NAVY, fontFamily: 'DM Sans, sans-serif' }}>{value}%</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Health</div>
        {/* Mask circle for progress */}
        <div style={{
          position: 'absolute', inset: -12,
          border: `12px solid ${RED}`,
          borderRadius: '50%',
          borderBottomColor: 'transparent',
          borderRightColor: value < 50 ? 'transparent' : RED,
          borderLeftColor:  value < 25 ? 'transparent' : RED,
          transform: 'rotate(45deg)',
        }} />
      </div>
    </div>
  );
}

function RadarRow({ color, label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
