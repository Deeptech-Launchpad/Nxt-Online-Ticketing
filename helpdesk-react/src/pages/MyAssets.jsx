import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const RED = '#CC3A3A';
const NAVY = '#02172E';
const GREEN = '#16a34a';
const AMBER = '#F59E0B';
const BLUE = '#0EA5E9';

/* Map a DB asset row â†’ display shape used by the cards */
function mapDbAsset(row, idx) {
  const today = new Date();
  const exp = row.warranty_expiry ? new Date(row.warranty_expiry) : null;
  let warrantyStatus = 'valid';
  let warrantyText = row.warranty_status || 'Active';
  if (exp) {
    const days = (exp - today) / (1000 * 60 * 60 * 24);
    if (days < 0)       { warrantyStatus = 'expired';  warrantyText = 'Expired'; }
    else if (days < 60) { warrantyStatus = 'expiring'; warrantyText = 'Expiring Soon'; }
    else                { warrantyStatus = 'valid';    warrantyText = `Valid till ${exp.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`; }
  }
  const health = row.health_percent ?? 100;
  let healthLabel = 'EXCELLENT', healthColor = GREEN;
  if (health < 50)      { healthLabel = 'POOR';      healthColor = '#dc2626'; }
  else if (health < 80) { healthLabel = 'FAIR';      healthColor = AMBER; }
  else if (health < 95) { healthLabel = 'GOOD';      healthColor = GREEN; }

  const typeLower = (row.type || '').toLowerCase();
  const icon = typeLower.includes('phone') || typeLower.includes('mobile') ? 'smartphone'
             : typeLower.includes('monitor') ? 'monitor'
             : typeLower.includes('keyboard') || typeLower.includes('mouse') ? 'keyboard'
             : 'laptop';

  return {
    id:           row.id,
    name:         row.name,
    type:         row.type || 'Device',
    icon,
    primary:      row.is_primary || idx === 0,    // first allocated = primary if not flagged
    serialNumber: row.serial_number,
    assignedDate: row.allocated_at ? new Date(row.allocated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'â€”',
    warranty:     warrantyText,
    warrantyStatus,
    condition:    row.condition || 'Good',
    health,
    healthLabel,
    healthColor,
    typePillBg:   row.is_primary || idx === 0 ? RED : (typeLower.includes('phone') ? AMBER : BLUE),
    iconBg:       row.is_primary || idx === 0 ? `linear-gradient(135deg, ${RED} 0%, #a82e2e 100%)` : '#f0f9ff',
    iconColor:    row.is_primary || idx === 0 ? '#fff' : BLUE,
    specs:        row.specs || { os: 'â€”', processor: 'â€”', ram: 'â€”', storage: 'â€”' },
    purchase:     { from: row.purchase_from || row.vendor_name || 'â€”', invoice: row.purchase_invoice || 'â€”' },
    serviceHistory: [],
  };
}

/*
  PLACEHOLDER DATA â€” shape designed for future backend wiring.
  Real endpoint will be: GET /api/assets/me
  Expected fields below align with `assets` + `asset_allocations` tables.
*/
const PLACEHOLDER_ASSETS = [
  {
    id: 'AST-2022-094',
    name: 'Dell Latitude 5520',
    type: 'Laptop',
    icon: 'laptop',
    primary: true,
    serialNumber: 'DL55-9012',
    assignedDate: 'Oct 15, 2022',
    warranty: 'Valid till Dec 2025',
    warrantyStatus: 'valid',
    condition: 'Good',
    health: 98,
    healthLabel: 'EXCELLENT',
    healthColor: GREEN,
    accentColor: RED,
    typePillBg: RED,
    iconBg: `linear-gradient(135deg, ${RED} 0%, #a82e2e 100%)`,
    iconColor: '#fff',
    specs: {
      os: 'Windows 11 Pro',
      processor: 'Intel Core i7-1185G7',
      ram: '16GB DDR4',
      storage: '512GB NVMe SSD',
    },
    purchase: {
      from: 'Dell Tech Direct',
      invoice: 'INV-29188',
    },
    serviceHistory: [
      { date: 'Sep 10, 2023', issue: 'Battery replacement', status: 'resolved' },
      { date: 'Aug 12, 2023', issue: 'Keyboard sticking', status: 'resolved' },
    ],
  },
  {
    id: 'AST-2023-112',
    name: 'iPhone 14 Pro',
    type: 'Mobile',
    icon: 'smartphone',
    primary: false,
    serialNumber: 'IP14-4421',
    assignedDate: 'Jan 10, 2023',
    warranty: 'Expiring Soon',
    warrantyStatus: 'expiring',
    condition: 'Good',
    health: 82,
    healthLabel: 'FAIR',
    healthColor: AMBER,
    typePillBg: AMBER,
    iconBg: '#fffbeb',
    iconColor: AMBER,
  },
  {
    id: 'AST-2022-401',
    name: 'Dell UltraSharp 27"',
    type: 'Monitor',
    icon: 'monitor',
    primary: false,
    serialNumber: 'DU27-8891',
    assignedDate: 'Oct 15, 2022',
    warranty: 'Valid till Dec 2025',
    warrantyStatus: 'valid',
    condition: 'Good',
    health: 100,
    healthLabel: 'PERFECT',
    healthColor: GREEN,
    typePillBg: BLUE,
    iconBg: '#f0f9ff',
    iconColor: BLUE,
  },
  {
    id: 'AST-2022-402',
    name: 'Apple Magic Keyboard & Mouse',
    type: 'Accessory',
    icon: 'keyboard',
    primary: false,
    serialNumber: 'AMK-9901',
    assignedDate: 'Oct 15, 2022',
    warranty: 'Valid till Oct 2024',
    warrantyStatus: 'valid',
    condition: 'Good',
    health: 95,
    healthLabel: 'HEALTHY',
    healthColor: GREEN,
    typePillBg: '#9333ea',
    iconBg: '#fdf4ff',
    iconColor: '#9333ea',
  },
];

const WARRANTY_BADGE = {
  valid:    { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'VALID' },
  expiring: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'EXPIRING SOON' },
  expired:  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'EXPIRED' },
};

const CONDITION_BADGE = {
  Good: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Fair: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  Poor: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

export default function MyAssets() {
  const navigate = useNavigate();
  const { fetchMyAssets } = useApp();
  const [expanded, setExpanded] = useState({});
  const [assets, setAssets] = useState(null);     // null = loading, [] = empty, [...] = data
  const [usingPlaceholder, setUsingPlaceholder] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMyAssets().then(rows => {
      if (cancelled) return;
      if (rows && rows.length > 0) {
        setAssets(rows.map(mapDbAsset));
        setUsingPlaceholder(false);
      } else {
        setAssets(PLACEHOLDER_ASSETS);
        setUsingPlaceholder(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const raiseTicketFor = (asset) => {
    navigate('/raise-ticket', { state: { device: asset.name, assetId: asset.id, serial: asset.serialNumber } });
  };

  if (assets === null) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading assets...</div>;
  }

  const primary = assets.find(a => a.primary) || assets[0];
  const others  = assets.filter(a => a.id !== primary?.id);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 27, fontWeight: 700, color: NAVY,
            letterSpacing: '-0.6px', fontFamily: 'DM Sans, sans-serif',
          }}>
            My Assets
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {assets.length} {assets.length === 1 ? 'device' : 'devices'} assigned to you
            {usingPlaceholder && <span style={{ color: AMBER, marginLeft: 8 }}>(showing demo data â€” no real assets allocated yet)</span>}
          </p>
        </div>
      </div>

      {/* PRIMARY (highlighted) ASSET */}
      {primary && (
        <PrimaryAssetCard
          asset={primary}
          expanded={!!expanded[primary.id]}
          onToggle={() => toggleExpand(primary.id)}
          onRaiseTicket={() => raiseTicketFor(primary)}
        />
      )}

      {/* GRID OF SECONDARY ASSETS */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginTop: 20,
      }}>
        {others.map(a => (
          <AssetCard
            key={a.id}
            asset={a}
            expanded={!!expanded[a.id]}
            onToggle={() => toggleExpand(a.id)}
            onRaiseTicket={() => raiseTicketFor(a)}
          />
        ))}
      </div>
    </div>
  );
}

function PrimaryAssetCard({ asset, expanded, onToggle, onRaiseTicket }) {
  const warr = WARRANTY_BADGE[asset.warrantyStatus] || WARRANTY_BADGE.valid;
  const cond = CONDITION_BADGE[asset.condition] || CONDITION_BADGE.Good;

  return (
    <div style={{
      background: 'var(--white)', borderRadius: 16, padding: 24,
      border: `1px solid ${RED}`,
      boxShadow: '0 8px 24px rgba(204,58,58,0.1)',
    }}>
      <Header asset={asset} primary />
      <FieldsGrid asset={asset} warr={warr} cond={cond} />
      <Footer expanded={expanded} onToggle={onToggle} onRaiseTicket={onRaiseTicket} />

      {expanded && (
        <div style={{ borderTop: '1px solid var(--slate)', paddingTop: 16, marginTop: 12 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: RED, marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
            Full Specifications & History
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Specs */}
            <div>
              <SectionLabel>Hardware Specifications</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="OS"        value={asset.specs.os} />
                <Field label="Processor" value={asset.specs.processor} />
                <Field label="RAM"       value={asset.specs.ram} />
                <Field label="Storage"   value={asset.specs.storage} />
              </div>
              <div style={{ marginTop: 16 }}>
                <SectionLabel>Purchase Information</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Purchased From" value={asset.purchase.from} />
                  <Field label="Invoice Number" value={asset.purchase.invoice} />
                </div>
              </div>
            </div>

            {/* Service history */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <SectionLabel inline>Service History</SectionLabel>
                <span style={{ fontSize: 12, color: RED, fontWeight: 600, cursor: 'pointer' }}>VIEW ALL TICKETS</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--slate)' }}>
                    <Th>Date</Th><Th>Issue</Th><Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {asset.serviceHistory.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <Td>{s.date}</Td>
                      <Td>{s.issue}</Td>
                      <Td><StatusPill status={s.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event</span>
                Last Serviced: <strong>{asset.serviceHistory[0]?.date || 'â€”'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset, expanded, onToggle, onRaiseTicket }) {
  const warr = WARRANTY_BADGE[asset.warrantyStatus] || WARRANTY_BADGE.valid;
  const cond = CONDITION_BADGE[asset.condition] || CONDITION_BADGE.Good;

  return (
    <div style={{
      background: 'var(--white)', borderRadius: 16, padding: 24,
      border: '1px solid var(--slate)',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.2s',
      ...(asset.warrantyStatus === 'expiring' ? { borderTop: `4px solid ${AMBER}` } : {}),
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <Header asset={asset} primary={false} />
      <FieldsGrid asset={asset} warr={warr} cond={cond} />
      <Footer expanded={expanded} onToggle={onToggle} onRaiseTicket={onRaiseTicket} />
    </div>
  );
}

function Header({ asset, primary }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: asset.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: asset.iconColor }}>
          {asset.icon}
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 18, fontWeight: 800, color: 'var(--text-primary)',
          marginBottom: 4, letterSpacing: '-0.5px',
        }}>
          {asset.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, color: '#fff',
            background: asset.typePillBg, padding: '3px 10px', borderRadius: 20,
            textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            {primary ? 'PRIMARY DEVICE' : asset.type.toUpperCase()}
          </span>
          {primary && (
            <span style={{ fontSize: 12, color: RED, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
              Optimized
            </span>
          )}
          {asset.warrantyStatus === 'expiring' && !primary && (
            <span style={{ fontSize: 11, color: AMBER, fontWeight: 700 }}>Warranty Expiring</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <FieldLabel>{primary ? 'Health Status' : 'Health'}</FieldLabel>
        <div style={{ fontSize: 13, fontWeight: 700, color: asset.healthColor }}>
          {asset.healthLabel} ({asset.health}%)
        </div>
        <div style={{ height: 4, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', marginTop: 6, width: 110, marginLeft: 'auto' }}>
          <div style={{ height: '100%', background: asset.healthColor, borderRadius: 4, width: `${asset.health}%` }} />
        </div>
      </div>
    </div>
  );
}

function FieldsGrid({ asset, warr, cond }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px 24px', marginBottom: 16,
    }}>
      <Field label="Asset ID"        value={asset.id} />
      <Field label="Serial Number"   value={asset.serialNumber} />
      <Field label="Assigned Date"   value={asset.assignedDate} />
      <div>
        <FieldLabel>Warranty</FieldLabel>
        <Pill bg={warr.bg} color={warr.color} border={warr.border}>{asset.warranty}</Pill>
      </div>
      <div>
        <FieldLabel>Condition</FieldLabel>
        <Pill bg={cond.bg} color={cond.color} border={cond.border}>{asset.condition}</Pill>
      </div>
    </div>
  );
}

function Footer({ expanded, onToggle, onRaiseTicket }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderTop: '1px solid var(--slate)', paddingTop: 14, gap: 12,
    }}>
      <span
        onClick={onToggle}
        style={{ fontSize: 12, color: RED, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
        {expanded ? 'Hide Full Details' : 'View Full Details'}
      </span>
      <span
        onClick={onRaiseTicket}
        style={{ fontSize: 12, color: RED, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
        Raise Ticket for this Device
      </span>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, inline }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.5px',
      marginBottom: inline ? 0 : 12,
    }}>
      {children}
    </div>
  );
}

function Th({ children }) {
  return (
    <th style={{
      fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.5px',
      textAlign: 'left', padding: '8px 4px',
    }}>{children}</th>
  );
}

function Td({ children }) {
  return <td style={{ fontSize: 13, padding: '10px 4px', color: 'var(--text-primary)' }}>{children}</td>;
}

function Pill({ bg, color, border, children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: bg, color, border: `1px solid ${border}`,
      letterSpacing: '0.02em',
    }}>
      {children}
    </span>
  );
}

function StatusPill({ status }) {
  if (status === 'resolved') {
    return <Pill bg="#f0fdf4" color="#16a34a" border="#bbf7d0">RESOLVED</Pill>;
  }
  if (status === 'open') {
    return <Pill bg="#eff6ff" color="#2563eb" border="#bfdbfe">OPEN</Pill>;
  }
  return <Pill bg="#f9fafb" color="#6b7280" border="#e5e7eb">{status.toUpperCase()}</Pill>;
}
