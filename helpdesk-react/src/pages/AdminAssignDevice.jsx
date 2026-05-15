import { useNavigate } from 'react-router-dom';

const NAVY = '#02172E';
const RED  = '#CC3A3A';

export default function AdminAssignDevice() {
  const navigate = useNavigate();
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 700, color: NAVY, letterSpacing: '-0.6px', fontFamily: 'DM Sans, sans-serif' }}>
            Assign New Device
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            3-step workflow to assign assets to employees
          </div>
        </div>
        <button
          onClick={() => navigate('/admin')}
          style={{
            padding: '10px 18px', background: 'var(--white)',
            border: '1px solid var(--slate)', borderRadius: 8,
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>

      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #F59E0B',
        borderRadius: 10, padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ color: '#F59E0B', fontSize: 24 }}>build_circle</span>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#92400e' }}>
            Coming Soon â€” 3-step Assign Device workflow
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
          The full 3-step workflow (Select Employee â†’ Select Available Asset â†’ Confirm with date and notes) will be built next.
          For now, please use the existing <a onClick={() => navigate('/admin/assets')} style={{ color: RED, fontWeight: 700, cursor: 'pointer' }}>Asset Master page</a> to manage allocations.
        </div>
      </div>
    </div>
  );
}
