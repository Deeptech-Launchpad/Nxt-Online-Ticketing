import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { downloadCSV, todayStamp } from '../utils/csv';
import { showToast } from '../components/Toast';

const DIVISIONS = ['Guntur -AndhraPradesh', 'RS Puram Coimbatore', 'Saibaba Colony-Coimbatore', 'Thudiyalur-coimbatore', 'WFH'];
const CATEGORIES = ['Hardware', 'Software', 'Network', 'Access / Login', 'Email', 'Printer', 'Other'];
const TIME_FILTERS = ['This Week', 'This Month', 'This Quarter', 'All Time'];

const CAT_COLORS = ['#CC3A3A', '#02172E', '#95BF47', '#f59e0b', '#8b5cf6', '#6366f1', '#0ea5e9'];
const CAT_ICONS = {
  'Hardware': 'memory',
  'Software': 'code',
  'Network': 'wifi',
  'Access / Login': 'lock',
  'Email': 'mail',
  'Printer': 'print',
  'Other': 'help_outline',
};

export default function AdminReports() {
  const { tickets } = useApp();
  const [timeFilter, setTimeFilter] = useState('All Time');

  const filteredTickets = useMemo(() => {
    if (timeFilter === 'All Time') return tickets;
    
    const now = new Date();
    
    const getStartOfWeek = (d) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff)).setHours(0,0,0,0);
    };
    const getStartOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const getStartOfQuarter = (d) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime();
    
    const startWeek = getStartOfWeek(now);
    const startMonth = getStartOfMonth(now);
    const startQuarter = getStartOfQuarter(now);
    
    return tickets.filter(t => {
      // Prefer the raw ISO from the backend — parsing the pre-formatted
      // string "2 Apr 2026, 8:50 am" back to a Date is browser-fragile
      // and could bucket the ticket into the wrong week/month.
      let raw = t.createdAtRaw || t.createdAt;
      if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(raw)) {
        raw += 'Z';
      }
      const tDate = new Date(raw).getTime();
      if (isNaN(tDate)) return true; // fallback
      if (timeFilter === 'This Week') return tDate >= startWeek;
      if (timeFilter === 'This Month') return tDate >= startMonth;
      if (timeFilter === 'This Quarter') return tDate >= startQuarter;
      return true;
    });
  }, [tickets, timeFilter]);

  const divisionStats = DIVISIONS.map(b => ({ name: b, count: filteredTickets.filter(t => t.division === b).length }));
  const catStats = CATEGORIES.map((c, i) => ({
    name: c,
    count: filteredTickets.filter(t => t.category === c).length,
    color: CAT_COLORS[i % CAT_COLORS.length],
    icon: CAT_ICONS[c] || 'category',
  }));
  const activeCatStats = catStats.filter(c => c.count > 0);
  const maxDiv = Math.max(...divisionStats.map(x => x.count), 1);

  const totalTickets = filteredTickets.length;
  const openCount = filteredTickets.filter(t => ['open', 'reopened'].includes(t.status)).length;
  const inProgressCount = filteredTickets.filter(t => t.status === 'in-progress').length;
  const resolvedCount = filteredTickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;

  const openRate = Math.round(openCount / Math.max(totalTickets, 1) * 100);
  const resRate = Math.round(resolvedCount / Math.max(totalTickets, 1) * 100);

  const exportCSV = () => {
    const sections = [];

    // Section 1: Summary KPIs
    sections.push({ Section: 'SUMMARY KPIS', Metric: '', Value: '', Detail: '' });
    sections.push({ Section: '', Metric: 'Time Range',     Value: timeFilter,                 Detail: '' });
    sections.push({ Section: '', Metric: 'Total Tickets',  Value: totalTickets,              Detail: 'All time within filter' });
    sections.push({ Section: '', Metric: 'Open Rate',      Value: openRate + '%',            Detail: `${openCount} open now` });
    sections.push({ Section: '', Metric: 'In Progress',    Value: inProgressCount,           Detail: 'Being worked on' });
    sections.push({ Section: '', Metric: 'Resolution Rate', Value: resRate + '%',            Detail: `${resolvedCount} resolved` });

    // Section 2: Tickets by Division
    sections.push({ Section: '', Metric: '', Value: '', Detail: '' });
    sections.push({ Section: 'TICKETS BY DIVISION', Metric: '', Value: '', Detail: '' });
    divisionStats.forEach(d => {
      sections.push({ Section: '', Metric: d.name, Value: d.count, Detail: '' });
    });

    // Section 3: Tickets by Category
    sections.push({ Section: '', Metric: '', Value: '', Detail: '' });
    sections.push({ Section: 'TICKETS BY CATEGORY', Metric: '', Value: '', Detail: '' });
    catStats.forEach(c => {
      sections.push({ Section: '', Metric: c.name, Value: c.count, Detail: '' });
    });

    downloadCSV(`reports-${timeFilter.replace(/\s+/g, '-').toLowerCase()}-${todayStamp()}.csv`, sections);
    showToast(`Report exported (${timeFilter})`, 'success');
  };

  const SUMMARY_KPIS = [
    {
      label: 'Total Tickets',
      value: totalTickets,
      icon: 'receipt_long',
      color: '#CC3A3A',
      bg: 'rgba(211,59,64,0.1)',
      sub: 'All time',
    },
    {
      label: 'Open Rate',
      value: openRate + '%',
      icon: 'pending_actions',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      sub: `${openCount} open now`,
    },
    {
      label: 'In Progress',
      value: inProgressCount,
      icon: 'autorenew',
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.1)',
      sub: 'Being worked on',
    },
    {
      label: 'Resolution Rate',
      value: resRate + '%',
      icon: 'task_alt',
      color: '#95BF47',
      bg: 'rgba(16,185,129,0.1)',
      sub: `${resolvedCount} resolved`,
    },
  ];

  return (
    <div className="page-fade">

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <div className="page-title" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>
            Reports &amp; Analytics
          </div>
          <div className="page-sub" style={{ marginTop: 4 }}>Data-driven insights into IT Helpdesk performance</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Time Filter Switcher */}
          <div style={{
            background: 'var(--white)',
            padding: '4px 5px',
            borderRadius: 12,
            border: '1px solid var(--slate)',
            display: 'flex',
            gap: 2,
          }}>
            {TIME_FILTERS.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                style={{
                  background: timeFilter === tf ? 'var(--blue)' : 'transparent',
                  color: timeFilter === tf ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'DM Sans, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {tf}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>file_download</span>
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {SUMMARY_KPIS.map((kpi, i) => (
          <div key={i} style={{
            background: 'var(--white)',
            borderRadius: 16,
            border: '1px solid var(--slate)',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'box-shadow 0.2s, transform 0.2s',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            {/* Background accent */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 80, height: 80, borderRadius: '50%',
              background: kpi.bg, pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: kpi.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: kpi.color }}>{kpi.icon}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-1.5px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{kpi.sub}</div>
            </div>
            {/* Bottom accent bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: kpi.color, opacity: 0.6, borderRadius: '0 0 16px 16px' }} />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 20, marginBottom: 24 }}>

        {/* Ticket Distribution by Category */}
        <div style={{
          background: 'var(--white)',
          borderRadius: 16,
          border: '1px solid var(--slate)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Card Header */}
          <div style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--slate)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.01)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(211,59,64,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--blue)' }}>donut_large</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.3px', margin: 0 }}>
                Ticket Distribution by Category
              </h3>
            </div>
            {activeCatStats.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--off-white)', padding: '3px 10px', borderRadius: 20 }}>No data</span>
            )}
          </div>

          {/* Category Cards Grid */}
          <div style={{ padding: '20px 22px', flex: 1 }}>
            {activeCatStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                No tickets found for this period.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                {activeCatStats.map((c, i) => {
                  const percentage = Math.round((c.count / Math.max(totalTickets, 1)) * 100);
                  const circumference = 2 * Math.PI * 16;
                  const dashArray = (percentage / 100) * circumference;
                  return (
                    <div key={c.name} style={{
                      padding: '14px 16px',
                      borderRadius: 14,
                      border: `1.5px solid ${c.color}22`,
                      background: `${c.color}08`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'default',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${c.color}20`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {/* SVG Ring Chart */}
                      <div style={{ width: 52, height: 52, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke={c.color} strokeWidth="3"
                            strokeDasharray={`${dashArray} ${circumference}`}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          />
                        </svg>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', zIndex: 1, fontFamily: 'DM Mono, monospace' }}>{c.count}</div>
                      </div>
                      {/* Label */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: c.color }}>{c.icon}</span>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{percentage}% of total</div>
                        {/* Mini progress */}
                        <div style={{ marginTop: 6, height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percentage}%`, background: c.color, borderRadius: 4, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Load by Division */}
        <div style={{
          background: 'var(--white)',
          borderRadius: 16,
          border: '1px solid var(--slate)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--slate)',
            background: 'rgba(0,0,0,0.01)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#6366f1' }}>location_on</span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', margin: 0, letterSpacing: '-0.3px' }}>Load by Division</h3>
          </div>

          {/* Division Rows */}
          <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {divisionStats.map((b, i) => {
              const pct = Math.round((b.count / maxDiv) * 100);
              const divColors = ['#CC3A3A', '#02172E', '#95BF47', '#f59e0b', '#0ea5e9'];
              const color = divColors[i % divColors.length];
              return (
                <div key={b.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                      {b.name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', fontFamily: "'DM Mono', monospace" }}>
                      {b.count} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>tkts</span>
                    </span>
                  </div>
                  <div style={{ background: 'var(--slate)', borderRadius: 8, height: 9, overflow: 'hidden' }}>
                    <div style={{
                      background: `linear-gradient(90deg, ${color}cc, ${color})`,
                      height: '100%',
                      borderRadius: 8,
                      width: `${pct || 0}%`,
                      minWidth: b.count > 0 ? 16 : 0,
                      transition: 'width 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Summary */}
          <div style={{
            margin: '0 22px 20px',
            padding: '14px 16px',
            borderRadius: 12,
            background: 'var(--off-white)',
            border: '1px solid var(--slate)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)', fontFamily: 'DM Sans, sans-serif' }}>{totalTickets}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>Total</div>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--slate)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#95BF47', fontFamily: 'DM Sans, sans-serif' }}>{resRate}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>Resolved</div>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--slate)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', fontFamily: 'DM Sans, sans-serif' }}>{openRate}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>Open</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown Bar */}
      <div style={{
        background: 'var(--white)',
        borderRadius: 16,
        border: '1px solid var(--slate)',
        padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', margin: 0, letterSpacing: '-0.3px' }}>Ticket Status Overview</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--off-white)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--slate)' }}>
            {totalTickets} total tickets
          </span>
        </div>

        {/* Stacked Bar */}
        <div style={{ height: 14, borderRadius: 10, overflow: 'hidden', display: 'flex', gap: 2, marginBottom: 20, background: 'var(--slate)' }}>
          {[
            { count: openCount, color: '#f59e0b', label: 'Open' },
            { count: inProgressCount, color: '#6366f1', label: 'In Progress' },
            { count: resolvedCount, color: '#95BF47', label: 'Resolved' },
          ].map((seg, i) => {
            const pct = (seg.count / Math.max(totalTickets, 1)) * 100;
            return pct > 0 ? (
              <div key={i} style={{
                width: `${pct}%`,
                background: seg.color,
                height: '100%',
                transition: 'width 1s ease',
                minWidth: 4,
              }} title={`${seg.label}: ${seg.count}`} />
            ) : null;
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Open', count: openCount, color: '#f59e0b', icon: 'pending_actions' },
            { label: 'In Progress', count: inProgressCount, color: '#6366f1', icon: 'autorenew' },
            { label: 'Resolved / Closed', count: resolvedCount, color: '#95BF47', icon: 'task_alt' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: item.color }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', fontFamily: "'DM Mono', monospace" }}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
