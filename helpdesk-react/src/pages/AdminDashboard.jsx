import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatusBadge, PriorityBadge } from '../components/Badge';

export default function AdminDashboard() {
  const { tickets, setStatus } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [fTab, setFTab] = useState('all'); // 'all', 'action_required', 'in_progress', 'resolved'
  const [fPriority, setFPriority] = useState('all');
  const [fCategory, setFCategory] = useState('all');
  const [fDivision, setFDivision] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Stats Logic (Global for Health Strip)
  const actionReq = tickets.filter(t => ['open', 'reopened'].includes(t.status)).length;
  const inprog = tickets.filter(t => t.status === 'in-progress').length;
  const closed = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;
  const urgent = tickets.filter(t => ['High', 'Very High'].includes(t.priority) && t.status !== 'closed').length;
  const total = tickets.length;

  const STATS = [
    { label: 'Awaiting Action', value: actionReq, sub: 'Open & Reopened', primary: true, icon: 'inbox', bg: 'var(--blue)' },
    { label: 'High Priority', value: urgent, sub: 'Needs immediate attention', valueColor: '#CC3A3A', icon: 'priority_high', color: '#CC3A3A', bg: 'rgba(204,58,58,0.1)' },
    { label: 'In Progress', value: inprog, sub: 'Currently being worked on', valueColor: '#2563eb', icon: 'autorenew', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    { label: 'Resolved', value: closed, sub: 'Total resolved tickets', valueColor: '#95BF47', icon: 'task_alt', color: '#95BF47', bg: 'rgba(149,191,71,0.12)' },
  ];

  // Filtering Logic
  const baseFiltered = useMemo(() => {
    return tickets.filter(t => {
      if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.employeeName.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
      
      if (fPriority === 'Urgent') {
        if (!['High', 'Very High'].includes(t.priority)) return false;
      } else if (fPriority !== 'all' && t.priority !== fPriority) {
        return false;
      }

      if (fCategory !== 'all' && t.category !== fCategory) return false;
      if (fDivision !== 'all' && t.division !== fDivision) return false;
      return true;
    });
  }, [tickets, search, fPriority, fCategory, fDivision]);

  const filtered = useMemo(() => {
    return baseFiltered.filter(t => {
      if (fTab === 'action_required' && !['open', 'reopened'].includes(t.status)) return false;
      if (fTab === 'in_progress' && t.status !== 'in-progress') return false;
      if (fTab === 'resolved' && !['resolved', 'closed'].includes(t.status)) return false;
      return true;
    });
  }, [baseFiltered, fTab]);

  // Dynamic counts for tabs
  const dynTotal = baseFiltered.length;
  const dynActionReq = baseFiltered.filter(t => ['open', 'reopened'].includes(t.status)).length;
  const dynInprog = baseFiltered.filter(t => t.status === 'in-progress').length;
  const dynClosed = baseFiltered.filter(t => ['resolved', 'closed'].includes(t.status)).length;

  const categories = [...new Set(tickets.map(t => t.category))];
  const divisions  = [...new Set(tickets.map(t => t.division))];

  const accentClass = (t) => {
    if (t.status === 'in-progress') return 'left-accent-in-progress';
    if (t.priority === 'Very High') return 'left-accent-urgent';
    if (t.priority === 'High')      return 'left-accent-high';
    return '';
  };

  const hasAdvancedFilters = fPriority !== 'all' || fCategory !== 'all' || fDivision !== 'all';

  return (
    <div className="page-fade">
      {/* ── Admin Welcome Banner ── */}
      <div style={{
        position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 24,
        background: 'linear-gradient(120deg, #02172E 0%, #021a38 35%, #02172E 65%, #CC3A3A 100%)',
        boxShadow: '0 8px 32px rgba(31,36,72,0.2)', minHeight: 132,
      }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.12, pointerEvents: 'none' }} viewBox="0 0 900 152" preserveAspectRatio="xMidYMid slice">
          <circle cx="830" cy="-30" r="170" fill="#fff" />
          <circle cx="700" cy="180" r="130" fill="#CC3A3A" />
          <circle cx="80"  cy="170" r="110" fill="#fff" />
        </svg>
        <div style={{
          position: 'relative', zIndex: 2, padding: '24px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg, #02172E 0%, #CC3A3A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px rgba(0,0,0,0.28)', border: '2px solid rgba(255,255,255,0.2)'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#fff' }}>admin_panel_settings</span>
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', fontFamily: 'Manrope, sans-serif', margin: 0, lineHeight: 1.2 }}>
                Admin Workspace
              </h2>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginTop: 4 }}>
                Manage and track all support tickets efficiently
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/reports')}
            style={{
              background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.22)',
              borderRadius: 12, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'none'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bar_chart</span>
            View Reports
          </button>
        </div>
      </div>

      {/* ── Health Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {STATS.map((s, i) => (
          <div 
            key={i} 
            className={s.primary ? 'stat-card primary-card' : 'stat-card'} 
            style={{ padding: '18px', cursor: 'pointer' }}
            onClick={() => {
              if (s.label === 'Awaiting Action') { setFTab('action_required'); setFPriority('all'); }
              if (s.label === 'High Priority') { setFTab('all'); setFPriority('Urgent'); }
              if (s.label === 'In Progress') { setFTab('in_progress'); setFPriority('all'); }
              if (s.label === 'Resolved') { setFTab('resolved'); setFPriority('all'); }
              // Optionally smooth scroll down a bit if on a smaller screen so they see the table change
              window.scrollTo({ top: document.body.scrollHeight / 3, behavior: 'smooth' });
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: s.primary ? '#fff' : s.color }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: s.primary ? '#fff' : s.valueColor, lineHeight: 1 }}>{s.value}</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.primary ? '#fff' : 'var(--text-primary)' }}>{s.label}</div>
              <div style={{ fontSize: 12.5, color: s.primary ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Ticket Grid ── */}
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate)', padding: 24 }}>
        
        {/* Quick Tabs & Search Bar Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 16 }}>
          <div className="quick-tabs" style={{ margin: 0, padding: 0, border: 'none' }}>
            <button className={`quick-tab-btn ${fTab === 'all' ? 'active' : ''}`} onClick={() => setFTab('all')}>
              All Tickets <span className="tab-count">{dynTotal}</span>
            </button>
            <button className={`quick-tab-btn ${fTab === 'action_required' ? 'active' : ''}`} onClick={() => setFTab('action_required')}>
              Action Required <span className="tab-count">{dynActionReq}</span>
            </button>
            <button className={`quick-tab-btn ${fTab === 'in_progress' ? 'active' : ''}`} onClick={() => setFTab('in_progress')}>
              In Progress <span className="tab-count">{dynInprog}</span>
            </button>
            <button className={`quick-tab-btn ${fTab === 'resolved' ? 'active' : ''}`} onClick={() => setFTab('resolved')}>
              Resolved <span className="tab-count">{dynClosed}</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="search-bar" style={{ minWidth: 260 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 18 }}>search</span>
              <input placeholder="Search ID, Issue, or Employee..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button 
              className="btn btn-white" 
              onClick={() => setShowFilters(!showFilters)}
              style={{ padding: '9px 14px', background: hasAdvancedFilters ? 'var(--blue-pale)' : 'var(--white)', borderColor: hasAdvancedFilters ? 'var(--blue-light)' : 'var(--slate)', color: hasAdvancedFilters ? 'var(--blue)' : 'var(--text-primary)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>filter_list</span>
              Filters {hasAdvancedFilters ? '(Active)' : ''}
            </button>
          </div>
        </div>

        {/* Advanced Filters Drawer */}
        {showFilters && (
          <div style={{ background: 'var(--off-white)', padding: 16, borderRadius: 12, border: '1px solid var(--slate)', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label-light">Priority</label>
              <select className="form-select-light" value={fPriority} onChange={e => setFPriority(e.target.value)}>
                <option value="all">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Very High">Very High</option>
                <option value="Urgent">High & Very High</option>
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label-light">Category</label>
              <select className="form-select-light" value={fCategory} onChange={e => setFCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label-light">Division</label>
              <select className="form-select-light" value={fDivision} onChange={e => setFDivision(e.target.value)}>
                <option value="all">All Divisions</option>
                {divisions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {hasAdvancedFilters && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-white" onClick={() => { setFPriority('all'); setFCategory('all'); setFDivision('all'); }} style={{ color: 'var(--danger)' }}>
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 5-Column Consolidated Table ── */}
        <div style={{ border: '1px solid var(--slate)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--text-muted)' }}>inbox</span>
              </div>
              <div className="empty-title">No tickets match</div>
              <div className="empty-sub">Try adjusting your filters above.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket & Requester</th>
                  <th>Context</th>
                  <th>Timing</th>
                  <th>Status & Priority</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className={accentClass(t)} onClick={() => navigate(`/admin/tickets/${t.id}`)}>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: 'var(--blue)', fontWeight: 700, background: 'var(--blue-pale)', padding: '2px 6px', borderRadius: 4 }}>
                          #{t.id}
                        </span>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
                        <span style={{ fontWeight: 600 }}>{t.employeeName}</span>
                        <span style={{ color: 'var(--slate)' }}>•</span>
                        <span>{t.division}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t.category}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{t.remote === 'In Person' ? 'hail' : 'desktop_windows'}</span>
                        {t.remote || 'Unknown'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t.createdAt?.split(',')[0]}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
                        {t.createdAt?.split(',')[1]?.trim() || '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-view-action" style={{ padding: '8px 16px' }}>
                        View
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
