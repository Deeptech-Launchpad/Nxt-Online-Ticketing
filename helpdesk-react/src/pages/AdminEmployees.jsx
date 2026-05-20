import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { showToast } from '../components/Toast';

const NAVY  = '#02172E';
const RED   = '#CC3A3A';
const GREEN = '#16a34a';
const AMBER = '#F59E0B';
const BLUE  = '#0EA5E9';

/* Hardcoded dropdown options for the Add Employee form */
const DEPARTMENTS = [
  'Engineering', 'Product Data Services', 'Production & Solutions',
  'Audit', 'Accounts & Finance', 'Business Development',
  'HR & Admin', 'L&D',
];
const JOB_ROLES = [
  'E-commerce Web Developer', 'Senior Lead Audit', 'Head - Production & Solutions',
  'Learning & Development Lead', 'Lead Generation', 'Lead - Accounts & Finance',
  'Talent & Admin Manager', 'Domain - Subject Matter Expert',
  'Senior Business Development Executive', 'Digital Commerce Lead (Client Solutions)',
  'Trainee-Software Developer', 'Senior Associate (Product Data Services) - I',
  'Senior Lead (WFH)', 'Junior Associate (Product Data Services) - I',
  'Senior Associate (Product Data Services) (WFH)', 'Junior Associate (Product Data Services) - II',
];
const DIVISIONS = [
  'Guntur -AndhraPradesh', 'RS Puram Coimbatore',
  'Saibaba Colony-Coimbatore', 'Thudiyalur-coimbatore', 'WFH',
];
const ORGANIZATIONS = [
  'AltiusNxt', 'Yantra24x7',
];

/* Pick an icon for the asset chip based on type */
const TYPE_ICON = {
  Laptop: 'laptop_mac',
  Desktop: 'desktop_windows',
  Monitor: 'monitor',
  Keyboard: 'keyboard',
  Mouse: 'mouse',
  Printer: 'print',
  Phone: 'smartphone',
  Tablet: 'tablet',
  Headset: 'headset_mic',
};
function iconForType(type) {
  return TYPE_ICON[type] || 'devices_other';
}

const STATUS_PILL = {
  open:          { bg: '#fef2f2', color: '#dc2626', label: 'Open' },
  reopened:      { bg: '#fef2f2', color: '#dc2626', label: 'Reopened' },
  'in-progress': { bg: '#fffbeb', color: '#d97706', label: 'In Progress' },
  resolved:      { bg: '#f0fdf4', color: '#16a34a', label: 'Resolved' },
  closed:        { bg: '#f0fdf4', color: '#16a34a', label: 'Closed' },
};

// Emails that should be protected from local inactivation (the system admins).
// Kept on the frontend purely to hide the button — the real enforcement
// lives in the backend's PATCH /:id/status endpoint.
const ADMIN_PROTECTED_EMAILS = new Set([
  'sanjana@altiusnxt.com',
]);

export default function AdminEmployees() {
  const { tickets, fetchEmployees, fetchAllAllocations, addEmployee, setUserStatus } = useApp();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});       // { [userId]: true }
  const [modalOpen, setModalOpen] = useState(false);

  /* Initial load + refresh */
  const reload = async () => {
    const [u, a] = await Promise.all([fetchEmployees(), fetchAllAllocations()]);
    // Filter out admin accounts - this page lists EMPLOYEES only.
    setUsers(Array.isArray(u) ? u.filter(x => x.role !== 'admin') : []);
    setAllocations(Array.isArray(a) ? a : []);
  };
  useEffect(() => { reload(); }, []);

  /* â”€â”€ Group: assets per employee email (case-insensitive) â”€â”€ */
  const assetsByEmail = useMemo(() => {
    const map = {};
    for (const a of allocations) {
      const key = (a.user_email || '').trim().toLowerCase();
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [allocations]);

  /* â”€â”€ Group: tickets per "key" (EMAIL or USER ID) â”€â”€
     Tickets in this codebase get linked to employees in TWO ways:
       - Seeded / admin-added users: tickets.employee_id = users.id (e.g. "EMP-2041")
       - OTP-logged users:           tickets.employee_id = users.email
     So we group by lowercased employee_id, then look up by both u.id and u.email. */
  const ticketsByKey = useMemo(() => {
    const map = {};
    for (const t of tickets) {
      const key = (t.employeeId || '').trim().toLowerCase();
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [tickets]);

  const ticketsForUser = (u) => {
    const byId    = ticketsByKey[(u.id    || '').trim().toLowerCase()] || [];
    const byEmail = ticketsByKey[(u.email || '').trim().toLowerCase()] || [];
    // De-dupe (in case both keys point to same ticket)
    const seen = new Set();
    return [...byId, ...byEmail].filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  };

  const openCountFor = (u) => {
    return ticketsForUser(u).filter(t => ['open', 'reopened', 'in-progress'].includes(t.status)).length;
  };

  /* â”€â”€ Search across name / dept / division / asset name+id â”€â”€ */
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => {
      // User fields
      if ((u.name         || '').toLowerCase().includes(q)) return true;
      if ((u.id           || '').toLowerCase().includes(q)) return true;
      if ((u.email        || '').toLowerCase().includes(q)) return true;
      if ((u.dept         || '').toLowerCase().includes(q)) return true;
      if ((u.division     || '').toLowerCase().includes(q)) return true;
      if ((u.organization || '').toLowerCase().includes(q)) return true;
      if ((u.designation  || '').toLowerCase().includes(q)) return true;
      if ((u.phone        || '').toLowerCase().includes(q)) return true;

      // Asset fields (any asset assigned to this user)
      const userAssets = assetsByEmail[(u.email || '').trim().toLowerCase()] || [];
      if (userAssets.some(a =>
        (a.asset_name  || '').toLowerCase().includes(q) ||
        (a.asset_id    || '').toLowerCase().includes(q) ||
        (a.asset_type  || '').toLowerCase().includes(q) ||
        (a.asset_brand || '').toLowerCase().includes(q)
      )) return true;

      // Ticket fields (any ticket raised by this user)
      const userTickets = ticketsForUser(u);
      if (userTickets.some(t =>
        (t.id       || '').toLowerCase().includes(q) ||
        (t.subject  || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.status   || '').toLowerCase().includes(q) ||
        (t.priority || '').toLowerCase().includes(q)
      )) return true;

      return false;
    });
  }, [users, search, assetsByEmail, ticketsByKey]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 700, color: NAVY, letterSpacing: '-0.6px', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
            Employees and Their Assets
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {filteredUsers.length} of {users.length} employees
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: RED, color: '#fff', border: 'none',
            padding: '11px 18px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(204,58,58,0.25)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
          Add Employee
        </button>
      </div>

      {/* SEARCH BAR */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <span className="material-symbols-outlined" style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', fontSize: 20,
        }}>search</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, EMP ID, asset, ticket ID or subject..."
          style={{
            width: '100%', padding: '12px 14px 12px 44px',
            border: '1px solid var(--slate)', borderRadius: 10,
            fontSize: 13, outline: 'none', background: 'var(--white)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* EMPLOYEE LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredUsers.length === 0 ? (
          <EmptyState search={search} />
        ) : (
          filteredUsers.map(u => {
            const userAssets = assetsByEmail[(u.email || '').trim().toLowerCase()] || [];
            const userTickets = ticketsForUser(u);
            const isOpen = !!expanded[u.id];
            const isProtected = ADMIN_PROTECTED_EMAILS.has((u.email || '').trim().toLowerCase());
            return (
              <EmployeeCard
                key={u.id}
                user={u}
                assets={userAssets}
                tickets={userTickets}
                openCount={openCountFor(u)}
                expanded={isOpen}
                isProtected={isProtected}
                onToggle={() => setExpanded(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                onTicketClick={(tid) => navigate(`/admin/tickets/${tid}`)}
                onToggleStatus={async () => {
                  const targetStatus = (u.status === 'inactive') ? 'active' : 'inactive';
                  const verb = targetStatus === 'inactive'
                    ? `Mark ${u.name} as inactive? They won't be able to log in until you re-activate them.`
                    : `Restore login access for ${u.name}?`;
                  if (!window.confirm(verb)) return;
                  const result = await setUserStatus(u.id, targetStatus);
                  if (result.ok) {
                    showToast(
                      targetStatus === 'inactive'
                        ? `${u.name} is now inactive — login blocked.`
                        : `${u.name} is now active — login restored.`,
                      'success'
                    );
                    await reload();
                  } else {
                    showToast(result.error || 'Failed to update status', 'error');
                  }
                }}
              />
            );
          })
        )}
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {modalOpen && (
        <AddEmployeeModal
          onClose={() => setModalOpen(false)}
          onSubmit={async (payload) => {
            const result = await addEmployee(payload);
            if (result.ok) {
              showToast(`Employee ${payload.name} added`, 'success');
              setModalOpen(false);
              await reload();
            } else {
              showToast(result.error || 'Failed to add employee', 'error');
            }
          }}
        />
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ EMPLOYEE CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function EmployeeCard({ user, assets, tickets, openCount, expanded, isProtected, onToggle, onTicketClick, onToggleStatus }) {
  const initials = user.avatar || (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isInactive = user.status === 'inactive';

  return (
    <div style={{
      background: 'var(--white)', borderRadius: 12,
      border: '1px solid var(--slate)', overflow: 'hidden',
      transition: 'all 0.18s',
      opacity: isInactive ? 0.7 : 1,
      ...(expanded ? { borderColor: RED, boxShadow: '0 6px 20px rgba(204,58,58,0.08)' } : {}),
    }}>
      {/* COLLAPSED HEADER ROW */}
      <div
        onClick={onToggle}
        style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
          cursor: 'pointer',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `linear-gradient(135deg, ${RED}, ${NAVY})`,
          color: '#fff', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
        }}>
          {initials}
        </div>

        {/* Identity column */}
        <div style={{ minWidth: 200, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>{user.name}</span>
            <span style={{
              background: '#f3f4f6',
              padding: '2px 8px', borderRadius: 4,
              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
            }}>
              {user.id}
            </span>
            {isInactive && (
              <span style={{
                background: '#e5e7eb', color: '#374151',
                padding: '2px 8px', borderRadius: 4,
                fontSize: 10, fontWeight: 800, letterSpacing: '0.4px',
              }}>
                INACTIVE
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {[user.designation, user.dept].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>

        {/* Asset chips */}
        <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
          {assets.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No assets assigned
            </span>
          ) : (
            assets.slice(0, 4).map(a => (
              <div key={a.asset_id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--off-white)', border: '1px solid var(--slate)',
                padding: '4px 10px', borderRadius: 6,
                fontSize: 11, fontWeight: 600, color: NAVY,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                  {iconForType(a.asset_type)}
                </span>
                {a.asset_name}
              </div>
            ))
          )}
          {assets.length > 4 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
              +{assets.length - 4} more
            </span>
          )}
        </div>

        {/* Open tickets pill */}
        <div style={{
          background: openCount > 0 ? '#fffbeb' : 'var(--off-white)',
          border: `1px solid ${openCount > 0 ? '#fde68a' : 'var(--slate)'}`,
          borderRadius: 8, padding: '8px 14px', textAlign: 'center', flexShrink: 0,
        }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            Open Tickets
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: openCount > 0 ? '#d97706' : NAVY, fontFamily: 'DM Sans, sans-serif' }}>
            {openCount}
          </div>
        </div>

        {/* Toggle chevron */}
        <span className="material-symbols-outlined" style={{
          fontSize: 24, color: 'var(--text-muted)',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          flexShrink: 0,
        }}>
          expand_more
        </span>
      </div>

      {/* EXPANDED BODY */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--slate)', padding: 20, background: '#fafbfc' }}>
          {/* Contact row */}
          {(user.email || user.phone || user.division) && (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20, fontSize: 12, color: 'var(--text-muted)' }}>
              {user.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mail</span>
                  {user.email}
                </div>
              )}
              {user.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span>
                  {user.phone}
                </div>
              )}
              {user.division && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>apartment</span>
                  {user.division}
                </div>
              )}
            </div>
          )}

          {/* ASSIGNED ASSETS TABLE */}
          <SectionHeader icon="devices" label="Assigned Assets" count={assets.length} />
          {assets.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', background: 'var(--white)', border: '1px dashed var(--slate)', borderRadius: 8, marginBottom: 24 }}>
              No assets currently assigned to this employee.
            </div>
          ) : (
            <div style={{ background: 'var(--white)', border: '1px solid var(--slate)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--off-white)', textAlign: 'left' }}>
                    <Th>Asset Name</Th>
                    <Th>Asset ID</Th>
                    <Th>Type</Th>
                    <Th>Warranty</Th>
                    <Th>Condition</Th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.asset_id} style={{ borderTop: '1px solid var(--slate)' }}>
                      <Td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--text-muted)' }}>
                            {iconForType(a.asset_type)}
                          </span>
                          <strong style={{ color: NAVY }}>{a.asset_name}</strong>
                        </span>
                      </Td>
                      <Td><span style={{ color: 'var(--text-muted)' }}>{a.asset_id}</span></Td>
                      <Td>{a.asset_type || '—'}</Td>
                      <Td>
                        <Pill
                          color={a.warranty_status === 'Expired' ? RED : GREEN}
                          bg={a.warranty_status === 'Expired' ? '#fef2f2' : '#f0fdf4'}
                          text={a.warranty_status === 'Expired' ? 'EXPIRED' : 'VALID'}
                        />
                      </Td>
                      <Td>
                        <Pill
                          color={(a.condition || 'Good') === 'Poor' ? RED : (a.condition || 'Good') === 'Fair' ? AMBER : GREEN}
                          bg={(a.condition || 'Good') === 'Poor' ? '#fef2f2' : (a.condition || 'Good') === 'Fair' ? '#fffbeb' : '#f0fdf4'}
                          text={(a.condition || 'Good').toUpperCase()}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* RAISED TICKETS LIST */}
          <SectionHeader icon="confirmation_number" label="Raised Tickets" count={tickets.length} />
          {tickets.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', background: 'var(--white)', border: '1px dashed var(--slate)', borderRadius: 8 }}>
              This employee hasn't raised any tickets yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tickets.slice(0, 5).map(t => {
                const sp = STATUS_PILL[t.status] || { bg: '#f3f4f6', color: '#475569', label: t.status };
                return (
                  <div
                    key={t.id}
                    onClick={() => onTicketClick(t.id)}
                    style={{
                      background: 'var(--white)', border: '1px solid var(--slate)',
                      borderRadius: 8, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = RED; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--slate)'; }}
                  >
                    <span style={{
                      fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                      background: '#f3f4f6', padding: '3px 8px', borderRadius: 4, color: NAVY,
                    }}>
                      {t.id}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.subject}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {t.category || 'General'} · {t.createdAt}
                      </div>
                    </div>
                    <Pill color={sp.color} bg={sp.bg} text={sp.label} />
                  </div>
                );
              })}
              {tickets.length > 5 && (
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '8px 0' }}>
                  Showing 5 of {tickets.length} tickets
                </div>
              )}
            </div>
          )}

          {/* ACCOUNT ACTIONS */}
          <div style={{ marginTop: 24 }}>
            <SectionHeader icon="manage_accounts" label="Account Actions" count={null} />
            {isProtected ? (
              <div style={{
                background: 'var(--white)', border: '1px solid var(--slate)', borderRadius: 8,
                padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: NAVY }}>shield</span>
                Protected admin account — cannot be deactivated from the UI.
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
                style={{
                  padding: '10px 18px', borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  border: 'none', color: '#fff',
                  background: isInactive ? GREEN : AMBER,
                  boxShadow: isInactive
                    ? '0 4px 12px rgba(22,163,74,0.25)'
                    : '0 4px 12px rgba(245,158,11,0.25)',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {isInactive ? 'check_circle' : 'block'}
                </span>
                {isInactive ? 'Set Active' : 'Set Inactive'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ADD EMPLOYEE MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function AddEmployeeModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    id: '', name: '', email: '',
    phone: '', designation: '', dept: '', division: '', organization: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const canSubmit = form.id.trim() && form.name.trim() && form.email.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(2, 23, 46, 0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
        animation: 'fadeIn 0.18s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--white)', borderRadius: 16,
          width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--slate)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'rgba(204,58,58,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ color: RED }}>person_add</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: NAVY, fontFamily: 'DM Sans, sans-serif' }}>
                Add New Employee
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Fill in the details to onboard a new employee
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Full Name" required full>
            <Input value={form.name} onChange={v => setField('name', v)} placeholder="e.g. Prabakaran" />
          </Field>
          <Field label="Employee ID" required>
            <Input value={form.id} onChange={v => setField('id', v)} placeholder="EMP-8492" />
          </Field>
          <Field label="Email" required>
            <Input value={form.email} onChange={v => setField('email', v)} placeholder="name@company.com" type="email" />
          </Field>
          <Field label="Phone (optional)">
            <Input value={form.phone} onChange={v => setField('phone', v)} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Job Role" full>
            <Select value={form.designation} onChange={v => setField('designation', v)} placeholder="Select job role" options={JOB_ROLES} />
          </Field>
          <Field label="Division">
            <Select value={form.division} onChange={v => setField('division', v)} placeholder="Select division" options={DIVISIONS} />
          </Field>
          <Field label="Organization">
            <Select value={form.organization} onChange={v => setField('organization', v)} placeholder="Select organization" options={ORGANIZATIONS} />
          </Field>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--slate)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px', border: '1px solid var(--slate)', background: 'var(--white)',
              color: NAVY, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            style={{
              padding: '10px 22px', border: 'none',
              background: canSubmit && !submitting ? RED : '#cbd5e1',
              color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
              boxShadow: canSubmit && !submitting ? '0 4px 12px rgba(204,58,58,0.25)' : 'none',
            }}
          >
            {submitting ? 'Adding...' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, placeholder, options }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '10px 12px',
        border: '1px solid var(--slate)', borderRadius: 8,
        fontSize: 13, outline: 'none',
        background: 'var(--white)',
        color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        cursor: 'pointer',
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SMALL HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function Field({ label, required, full, children }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        {label} {required && <span style={{ color: RED }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '10px 12px',
        border: '1px solid var(--slate)', borderRadius: 8,
        fontSize: 13, outline: 'none', background: 'var(--white)', color: 'var(--text-primary)',
      }}
    />
  );
}

function SectionHeader({ icon, label, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: RED }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      {count !== null && count !== undefined && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
          ({count})
        </span>
      )}
    </div>
  );
}

function Th({ children }) {
  return <th style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-primary)' }}>{children}</td>;
}
function Pill({ color, bg, text }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 12,
      background: bg, color, border: `1px solid ${color}33`,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
    }}>
      {text}
    </span>
  );
}

function EmptyState({ search }) {
  return (
    <div style={{
      padding: '40px 20px', textAlign: 'center',
      background: 'var(--white)', border: '1px dashed var(--slate)', borderRadius: 12,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.4, display: 'block', marginBottom: 12 }}>
        {search ? 'search_off' : 'group'}
      </span>
      <div style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>
        {search ? `No employees match "${search}"` : 'No employees yet'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
        {search ? 'Try a different search term.' : 'Click "Add Employee" to onboard your first team member.'}
      </div>
    </div>
  );
}
