import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { showToast } from '../components/Toast';

const NAVY  = '#02172E';
const RED   = '#CC3A3A';
const BLUE  = '#0EA5E9';
const GREEN = '#16a34a';

export default function EmployeeProfile() {
  const { currentUser, updateProfile, getMyTickets } = useApp();

  const [form, setForm] = useState({
    name:        currentUser?.name        || '',
    email:       currentUser?.email       || '',
    phone:       currentUser?.phone       || '',
    designation: currentUser?.designation || '',
    dept:        currentUser?.dept        || '',
    division:    currentUser?.division    || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setForm(prev => ({
      ...prev,
      name:        currentUser.name        || prev.name,
      email:       currentUser.email       || prev.email,
      phone:       currentUser.phone       || prev.phone,
      designation: currentUser.designation || prev.designation,
      dept:        currentUser.dept        || prev.dept,
      division:    currentUser.division    || prev.division,
    }));
  }, [currentUser]);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const initials = (form.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const myTickets = getMyTickets ? getMyTickets() : [];
  const openTickets = myTickets.filter(t => ['open', 'reopened', 'in-progress'].includes(t.status)).length;

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile({
      name:        form.name,
      phone:       form.phone,
      designation: form.designation,
      dept:        form.dept,
      division:    form.division,
    });
    setSaving(false);
    if (result.ok) showToast('Profile saved', 'success');
    else           showToast(result.error || 'Failed to save', 'error');
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1 style={{ fontSize: 27, fontWeight: 700, color: NAVY, letterSpacing: '-0.6px', fontFamily: 'DM Sans, sans-serif', marginBottom: 24 }}>
        My Profile
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 28, alignItems: 'flex-start' }}>
        {/* â”€â”€ LEFT CARD â”€â”€ */}
        <div style={{
          background: 'var(--white)', borderRadius: 16,
          border: '1px solid var(--slate)', padding: 28, textAlign: 'center',
        }}>
          <div style={{ position: 'relative', width: 86, height: 86, margin: '0 auto 16px' }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: `linear-gradient(135deg, ${RED}, ${NAVY})`,
              color: '#fff', fontSize: 28, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              {initials}
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 24, height: 24, borderRadius: '50%',
              background: BLUE, border: '2px solid var(--white)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#fff' }}>verified</span>
            </div>
          </div>

          <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, fontFamily: 'DM Sans, sans-serif' }}>
            {form.name || 'Employee'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginBottom: 14 }}>
            {form.designation || 'Team Member'}
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{
              background: GREEN, color: '#fff',
              padding: '5px 12px', borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.4px',
            }}>
              EMPLOYEE
            </span>
            {form.dept && (
              <span style={{
                background: 'var(--white)', color: NAVY, border: `1px solid ${NAVY}`,
                padding: '4px 12px', borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}>
                {form.dept}
              </span>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 18 }}>
            {form.division || '-'}
          </div>

          <div style={{ borderTop: '1px solid var(--slate)', paddingTop: 14, textAlign: 'left' }}>
            <InfoRow icon="badge" label="Employee ID"   value={currentUser?.id || '-'} />
            <InfoRow icon="mail"  label="Email"         value={form.email || '-'} />
            <InfoRow icon="call"  label="Phone"         value={form.phone || 'Not set'} />
            <InfoRow icon="confirmation_number" label="Open Tickets" value={`${openTickets} active`} />
          </div>
        </div>

        {/* â”€â”€ RIGHT PANEL â”€â”€ */}
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate)', padding: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 22, fontFamily: 'DM Sans, sans-serif' }}>
            Account Settings
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <FormField label="Full Name"   value={form.name}        onChange={v => setField('name', v)} />
            <FormField label="Email"       value={form.email}       readOnly hint="Login email - cannot be changed" />
            <FormField label="Phone"       value={form.phone}       onChange={v => setField('phone', v)} />
            <FormField label="Designation" value={form.designation} onChange={v => setField('designation', v)} />
            <FormField label="Department"  value={form.dept}        onChange={v => setField('dept', v)} />
            <FormField label="Division / Office" value={form.division} onChange={v => setField('division', v)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 26 }}>
            <button
              disabled={saving}
              onClick={handleSave}
              style={{
                background: RED, color: '#fff', border: 'none',
                padding: '12px 24px', borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(204,58,58,0.25)',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--slate)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)' }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginTop: 2, wordBreak: 'break-all' }}>{value}</div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, readOnly, hint, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {readOnly && <span className="material-symbols-outlined" style={{ fontSize: 12, opacity: 0.6 }}>lock</span>}
      </div>
      <input
        readOnly={readOnly}
        value={value || ''}
        onChange={readOnly ? undefined : (e => onChange?.(e.target.value))}
        style={{
          width: '100%', padding: '11px 14px', fontSize: 14,
          background: readOnly ? 'var(--off-white)' : 'var(--white)',
          border: '1px solid var(--slate)', borderRadius: 10,
          color: readOnly ? 'var(--text-muted)' : 'var(--text-primary)',
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          cursor: readOnly ? 'not-allowed' : 'text',
        }}
      />
      {hint && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
          {hint}
        </div>
      )}
    </div>
  );
}
