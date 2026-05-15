import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { showToast } from '../components/Toast';

const NAVY = '#02172E';
const RED  = '#CC3A3A';

const STORAGE_KEY = 'nxt_platform_settings';

const DEFAULT_SETTINGS = {
  platformName: 'AltiusNxt Support Portal',
  supportEmail: 'support@altiusnxt.com',
  language:     'English (US)',
  timezone:     '(GMT+05:30) Chennai, Kolkata',
};

const LANGUAGES = ['English (US)', 'English (UK)', 'Tamil'];
const TIMEZONES = [
  '(GMT+05:30) Chennai, Kolkata',
  '(GMT+00:00) London',
  '(GMT-05:00) New York',
  '(GMT+04:00) Dubai',
  '(GMT+08:00) Singapore',
];

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function AdminSettings() {
  const { theme, toggleTheme } = useTheme();
  const [section, setSection] = useState('general');
  const [settings, setSettings] = useState(loadSettings());
  const [dirty, setDirty]       = useState(false);

  // Mark dirty on any change so Save button activates
  useEffect(() => { setDirty(false); }, []);

  const setField = (k, v) => {
    setSettings(prev => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const saveAll = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setDirty(false);
      showToast('Settings saved', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 700, color: NAVY, letterSpacing: '-0.6px', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
            Settings Center
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Manage your platform configuration and preferences
          </div>
        </div>
        <button
          onClick={saveAll}
          disabled={!dirty}
          style={{
            background: dirty ? RED : '#cbd5e1',
            color: '#fff', border: 'none',
            padding: '11px 20px', borderRadius: 10,
            fontSize: 13, fontWeight: 700,
            cursor: dirty ? 'pointer' : 'not-allowed',
            boxShadow: dirty ? '0 4px 12px rgba(204,58,58,0.25)' : 'none',
          }}
        >
          Save Global Changes
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 32 }}>
        {/* â”€â”€ Sidebar nav â”€â”€ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <NavBtn icon="tune"    label="General"    active={section === 'general'}    onClick={() => setSection('general')} />
          <NavBtn icon="palette" label="Appearance" active={section === 'appearance'} onClick={() => setSection('appearance')} />
        </div>

        {/* â”€â”€ Content panel â”€â”€ */}
        <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--slate)', padding: 32 }}>
          {section === 'general' && (
            <GeneralPanel settings={settings} setField={setField} />
          )}
          {section === 'appearance' && (
            <AppearancePanel theme={theme} toggleTheme={toggleTheme} />
          )}
        </div>
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
        background: active ? RED : 'var(--white)',
        color: active ? '#fff' : 'var(--text-muted)',
        border: active ? 'none' : '1px solid var(--slate)',
        fontWeight: 700, fontSize: 13,
        boxShadow: active ? '0 4px 12px rgba(204,58,58,0.25)' : 'none',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
      {label}
    </div>
  );
}

function GeneralPanel({ settings, setField }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 24, fontFamily: 'DM Sans, sans-serif' }}>
        General Configuration
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <FormField label="Platform Name">
          <Input value={settings.platformName} onChange={v => setField('platformName', v)} />
        </FormField>
        <FormField label="Support Email">
          <Input value={settings.supportEmail} onChange={v => setField('supportEmail', v)} type="email" />
        </FormField>
        <FormField label="Default Language">
          <Select value={settings.language} onChange={v => setField('language', v)} options={LANGUAGES} />
        </FormField>
        <FormField label="Timezone">
          <Select value={settings.timezone} onChange={v => setField('timezone', v)} options={TIMEZONES} />
        </FormField>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '11px 14px', fontSize: 14,
        background: 'var(--white)', border: '1px solid var(--slate)', borderRadius: 10,
        color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', outline: 'none',
      }}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '11px 14px', fontSize: 14,
        background: 'var(--white)', border: '1px solid var(--slate)', borderRadius: 10,
        color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', outline: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function AppearancePanel({ theme, toggleTheme }) {
  const isDark = theme === 'dark';
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 24, fontFamily: 'DM Sans, sans-serif' }}>
        Platform Appearance
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
        Theme Mode
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ThemeCard
          icon="light_mode"
          label="LIGHT MODE"
          active={!isDark}
          onClick={() => { if (isDark) toggleTheme(); }}
        />
        <ThemeCard
          icon="dark_mode"
          label="DARK MODE"
          active={isDark}
          onClick={() => { if (!isDark) toggleTheme(); }}
        />
      </div>
    </div>
  );
}

function ThemeCard({ icon, label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `2px solid ${active ? RED : 'var(--slate)'}`,
        borderRadius: 10, padding: 24, textAlign: 'center', cursor: 'pointer',
        background: active ? '#fff7f7' : 'var(--white)',
        transition: 'all 0.2s',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 32, color: active ? RED : 'var(--text-muted)' }}>{icon}</span>
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8, color: active ? RED : 'var(--text-primary)' }}>{label}</div>
    </div>
  );
}
