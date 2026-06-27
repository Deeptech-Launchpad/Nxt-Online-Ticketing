import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { showToast } from '../components/Toast';

const RED   = '#CC3A3A';
const NAVY  = '#02172E';
const GREEN = '#16a34a';
const AMBER = '#F59E0B';

/* â”€â”€ CATEGORY CARDS (Step 1) â”€â”€ */
const CATEGORIES = [
  { id: 'Hardware',  label: 'Laptop or Desktop', icon: 'laptop' },
  { id: 'Software',  label: 'Software Error',    icon: 'code' },
  { id: 'Network',   label: 'Internet or Network', icon: 'wifi' },
  { id: 'Email',     label: 'Email',             icon: 'mail' },
  { id: 'Printer',   label: 'Printer',           icon: 'print' },
  { id: 'Other',     label: 'Other',             icon: 'more_horiz' },
];

const PRIORITIES = [
  { id: 'Low',    icon: 'inbox',    desc: 'No rush, whenever possible',  color: GREEN, bg: '#f0fdf4' },
  { id: 'Medium', icon: 'info',     desc: 'Impacting my daily work',     color: AMBER, bg: '#fffbeb' },
  { id: 'High',   icon: 'warning',  desc: 'Completely blocked, urgent',  color: '#dc2626', bg: '#fef2f2' },
];

// "Other / Not Listed" fallback — always appended to the device picker so
// employees with no assigned assets (or with an issue not tied to a specific
// device) can still raise a ticket. Real assets come from GET /api/assets/me.
const OTHER_DEVICE = {
  id: 'GEN-0000',
  name: 'Other / Not Listed',
  icon: 'help',
  serial: 'N/A',
  date: 'N/A',
  warranty: 'N/A',
  condition: 'N/A',
};

// Map an asset's `type` (Laptop / Monitor / etc.) to a Material Symbols icon
// so the device card visual matches what the employee actually owns.
const ASSET_TYPE_ICON = {
  Laptop:     'laptop',
  Desktop:    'desktop_windows',
  Monitor:    'monitor',
  Printer:    'print',
  Networking: 'router',
  UPS:        'battery_charging_full',
  Phone:      'smartphone',
  Mobile:     'smartphone',
  Other:      'devices_other',
};

const API = '/api';

const REMOTES = [
  { id: 'In Person',   icon: 'person',           sub: 'On-site visit' },
  { id: 'Over Phone',  icon: 'phone_in_talk',    sub: 'Call support' },
  { id: 'AnyDesk',     icon: 'screen_share',     sub: 'Fast & light' },
  { id: 'UltraViewer', icon: 'connected_tv',     sub: 'Simple' },
  { id: 'TeamViewer',  icon: 'desktop_windows',  sub: 'Enterprise' },
];

const TIME_SLOTS = [
  '9 AM - 10 AM', '10 AM - 11 AM', '11 AM - 12 PM',
  '12 PM - 1 PM', '1 PM - 2 PM',   '2 PM - 3 PM',
  '3 PM - 4 PM',  '4 PM - 5 PM',   'Any Time',
];

const STEPS = ['Issue Details', 'Device & Asset', 'Remote Access', 'Review'];

export default function RaiseTicket() {
  const { currentUser, submitTicket } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(null);
  // Guards against duplicate ticket creation when admin double-clicks Submit
  // or the browser/network retries the POST. The ref blocks reentry
  // synchronously; the state drives the button's disabled + "Submitting..."
  // visual so the user knows the click registered.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [subject, setSubject]   = useState('');
  const [category, setCategory] = useState('Hardware');
  const [priority, setPriority] = useState('Low');
  const [desc, setDesc]         = useState('');
  const [fileName, setFileName] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);

  // Step 2
  const [selectedDevice, setSelectedDevice] = useState(null); // device object
  const [deviceNotes, setDeviceNotes]       = useState('');

  // Step 3
  const [remote, setRemote]         = useState('In Person');
  const [timeSlot, setTimeSlot]     = useState('Any Time');

  // Real assets allocated to the logged-in employee (from /api/assets/me).
  // Empty array = no assets assigned → only "Other / Not Listed" will show.
  const [myAssets, setMyAssets] = useState([]);

  useEffect(() => {
    const email = currentUser?.email;
    if (!email) return;
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch(`${API}/assets/me?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const mapped = data.map(a => ({
          id:        a.id,
          name:      a.name,
          icon:      ASSET_TYPE_ICON[a.type] || 'devices_other',
          serial:    a.serial_number || 'N/A',
          date:      a.allocated_at ? new Date(a.allocated_at).toLocaleDateString() : (a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : 'N/A'),
          warranty:  a.warranty_expiry ? `Valid till ${new Date(a.warranty_expiry).toLocaleDateString()}` : (a.warranty_status || 'N/A'),
          condition: a.condition || 'Good',
        }));
        setMyAssets(mapped);
      } catch {
        // Silently fall back to "Other / Not Listed" only
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.email]);

  // Pre-fill from "Raise ticket for this device" link (e.g. from My Assets page)
  useEffect(() => {
    const incoming = location.state;
    if (!incoming?.device) return;
    const match = myAssets.find(d => d.id === incoming.assetId) ||
                  myAssets.find(d => d.name === incoming.device);
    if (match) setSelectedDevice(match);
  }, [location.state, myAssets]);

  // Always include "Other / Not Listed" as the final card so employees with
  // no allocated devices (or with an asset-less issue) can still continue.
  const filteredDevices = [...myAssets, OTHER_DEVICE];

  const goStep = (n) => {
    if (n === 2 && !subject.trim()) {
      showToast('Please enter what the problem is', 'error');
      return;
    }
    if (n === 2 && !desc.trim()) {
      showToast('Please describe the issue', 'error');
      return;
    }
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    // Block double-fire (fast double-click, browser retry, etc.). The ref is
    // synchronous so a second click landing in the same event-batch as the
    // first is rejected immediately — preventing duplicate tickets.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const id = await submitTicket({
        division: currentUser?.division || '',
        category,
        subject,
        desc,
        priority,
        device: selectedDevice ? `${selectedDevice.name} (${selectedDevice.id})` : '',
        remote,
        preferredTime: timeSlot,
        deviceNotes,
        attachmentFile,
      }, currentUser);

      if (id) {
        setSuccess(id);
      } else {
        showToast('Failed to submit ticket. Please try again.', 'error');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (success) {
    return <SuccessCard ticketId={success} onAnother={() => { setSuccess(null); setStep(1); }} onView={() => navigate('/history')} />;
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 1100, margin: '0 auto' }}>
      {/* BREADCRUMB */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: 'var(--text-muted)', marginBottom: 18,
      }}>
        <a onClick={() => navigate('/dashboard')} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>Dashboard</a>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        <span>Raise New Ticket</span>
      </div>

      {/* STEP INDICATOR */}
      <StepIndicator step={step} />

      {/* STEPS */}
      <div style={{
        background: 'var(--white)', borderRadius: 12,
        border: '1px solid var(--slate)', padding: 28,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {step === 1 && (
          <Step1
            subject={subject} setSubject={setSubject}
            category={category} setCategory={setCategory}
            priority={priority} setPriority={setPriority}
            desc={desc} setDesc={setDesc}
            fileName={fileName} setFileName={setFileName}
            setAttachmentFile={setAttachmentFile}
            onNext={() => goStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            devices={filteredDevices}
            selected={selectedDevice} setSelected={setSelectedDevice}
            notes={deviceNotes} setNotes={setDeviceNotes}
            onBack={() => goStep(1)}
            onNext={() => goStep(3)}
          />
        )}
        {step === 3 && (
          <Step3
            remote={remote} setRemote={setRemote}
            timeSlot={timeSlot} setTimeSlot={setTimeSlot}
            onBack={() => goStep(2)}
            onNext={() => goStep(4)}
          />
        )}
        {step === 4 && (
          <Step4
            subject={subject} category={category} priority={priority} desc={desc}
            device={selectedDevice} remote={remote} timeSlot={timeSlot}
            goStep={goStep}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STEP INDICATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StepIndicator({ step }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32,
    }}>
      {STEPS.map((label, idx) => {
        const n = idx + 1;
        const state = n < step ? 'done' : n === step ? 'active' : 'todo';
        const color = state === 'done' || state === 'active' ? RED : 'var(--slate)';
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: idx === STEPS.length - 1 ? '0 0 auto' : 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13,
                background: state === 'done' ? RED : 'transparent',
                border: `2px solid ${color}`,
                color: state === 'done' ? '#fff' : color,
              }}>
                {state === 'done'
                  ? <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                  : n}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {label}
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{
                flex: 1, maxWidth: 160, height: 2,
                background: n < step ? RED : 'var(--slate)',
                margin: '0 12px', marginTop: -22,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STEP 1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Step1({ subject, setSubject, category, setCategory, priority, setPriority, desc, setDesc, fileName, setFileName, setAttachmentFile, onNext }) {
  return (
    <>
      <FormGroup label="What is the problem?">
        <input
          value={subject} onChange={e => setSubject(e.target.value)}
          placeholder="e.g. Laptop not turning on"
          style={inputStyle}
        />
      </FormGroup>

      <FormGroup label="Category">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <CategoryCard
              key={c.id}
              icon={c.icon} label={c.label}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
            />
          ))}
        </div>
      </FormGroup>

      <FormGroup label="How urgent is this?">
        <div style={{ display: 'flex', gap: 10 }}>
          {PRIORITIES.map(p => (
            <PriorityCard
              key={p.id}
              priority={p}
              active={priority === p.id}
              onClick={() => setPriority(p.id)}
            />
          ))}
        </div>
      </FormGroup>

      <FormGroup label="Describe the issue">
        <textarea
          value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Please provide as much detail as possible to help us resolve it quickly..."
          maxLength={600}
          style={{ ...inputStyle, minHeight: 120, resize: 'vertical', lineHeight: 1.5 }}
        />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
          {desc.length} / 600
        </div>
      </FormGroup>

      <FormGroup label="Attach Screenshot (Optional)">
        <label style={{
          display: 'block', border: '2px dashed var(--slate)', borderRadius: 12,
          padding: 24, textAlign: 'center', cursor: 'pointer', transition: 'all 0.18s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.background = '#fff7f7'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--slate)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <input
            type="file"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              setAttachmentFile(f || null);
              setFileName(f?.name || '');
            }}
          />
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--text-muted)' }}>cloud_upload</span>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Drag and drop or click to upload
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            PNG, JPG, PDF up to 10MB
          </div>
          {fileName && <div style={{ marginTop: 10, fontSize: 12, color: RED, fontWeight: 600 }}>ðŸ“Ž {fileName}</div>}
        </label>
      </FormGroup>

      <button onClick={onNext} style={primaryButtonStyle}>
        Next: Select Device <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
      </button>
    </>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STEP 2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Step2({ devices, selected, setSelected, notes, setNotes, onBack, onNext }) {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--text-primary)' }}>
          Which device is affected?
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {devices.length <= 1
            ? 'No assets assigned to you yet — continue with "Other / Not Listed" or contact your admin.'
            : 'Pick the device this issue is about, or "Other / Not Listed" if it isn\'t one of your assigned devices.'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {devices.map(d => (
          <DeviceCard key={d.id} device={d} active={selected?.id === d.id} onClick={() => setSelected(d)} />
        ))}
      </div>

      {selected && <AutofillPanel device={selected} />}

      <FormGroup label="Anything else about the device? (Optional)">
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="E.g., It was dropped, exposed to water, making weird noises..."
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
        />
      </FormGroup>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} style={{ ...outlineButtonStyle, flex: 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back
        </button>
        <button onClick={onNext} style={{ ...primaryButtonStyle, flex: 2, marginTop: 0 }}>
          Next: Remote Access <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
        </button>
      </div>
    </>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STEP 3 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Step3({ remote, setRemote, timeSlot, setTimeSlot, onBack, onNext }) {
  return (
    <>
      <SectionHeader icon="cast" title="Remote Access Preference" subtitle="Allow the admin to connect remotely and fix your issue faster." />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        {REMOTES.map(r => (
          <RemoteCard key={r.id} remote={r} active={remote === r.id} onClick={() => setRemote(r.id)} />
        ))}
      </div>

      <SectionHeader icon="schedule" title="Preferred Time Slot" subtitle="When would you like the admin to reach you?" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
        {TIME_SLOTS.map(s => (
          <TimeSlotCard key={s} slot={s} active={timeSlot === s} onClick={() => setTimeSlot(s)} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} style={{ ...outlineButtonStyle, flex: 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back
        </button>
        <button onClick={onNext} style={{ ...primaryButtonStyle, flex: 2, marginTop: 0 }}>
          Review Ticket <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
        </button>
      </div>
    </>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STEP 4 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Step4({ subject, category, priority, desc, device, remote, timeSlot, goStep, onSubmit, submitting }) {
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
        Review your ticket before submitting
      </div>

      <ReviewSection title="Issue Details" onEdit={() => goStep(1)}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--text-primary)' }}>{subject}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            background: 'var(--off-white)', color: 'var(--text-primary)',
            border: '1px solid var(--slate)', padding: '3px 10px', borderRadius: 20,
            fontSize: 11, fontWeight: 700,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: 'middle' }}>folder</span> {category}
          </span>
          <span style={{
            background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 12, verticalAlign: 'middle' }}>warning</span> {priority} Priority
          </span>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-muted)' }}>{desc}</div>
      </ReviewSection>

      <ReviewSection title="Device & Asset" onEdit={() => goStep(2)}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--off-white)', borderRadius: 8, padding: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#f0fdf4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{device?.icon || 'help'}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Device Name</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{device?.name || 'Not selected'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Asset ID / Serial</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {device ? `${device.id} (${device.serial})` : '-'}
            </div>
          </div>
        </div>
      </ReviewSection>

      <ReviewSection title="Remote Access" onEdit={() => goStep(3)}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <ReviewBadge icon="cast"     label="ACCESS METHOD" value={remote} />
          <ReviewBadge icon="schedule" label="TIME SLOT"     value={timeSlot} />
        </div>
      </ReviewSection>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', margin: '16px 0 12px' }}>
        Submit this ticket?
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => goStep(3)} style={{ ...outlineButtonStyle, flex: 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{
            ...primaryButtonStyle, flex: 2, marginTop: 0,
            opacity: submitting ? 0.65 : 1,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </div>
    </>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SUCCESS CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SuccessCard({ ticketId, onAnother, onView }) {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 600, margin: '60px auto' }}>
      <div style={{
        background: 'var(--white)', borderRadius: 12, border: '1px solid var(--slate)',
        padding: '48px 32px', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, background: '#f0fdf4', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: GREEN }}>task_alt</span>
        </div>
        <h2 style={{
          fontSize: 22, fontWeight: 700, marginBottom: 8,
          color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif',
        }}>
          Ticket Submitted!
        </h2>
        <div style={{
          display: 'inline-block', background: '#f0fdf4', color: GREEN,
          border: '1px solid #bbf7d0', padding: '6px 18px', borderRadius: 6,
          fontSize: 13, fontWeight: 600, margin: '8px 0',
          fontFamily: 'DM Mono, monospace',
        }}>
          Ticket ID: {ticketId}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '12px 0 24px' }}>
          You will receive email updates as we work on your issue.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onView} style={outlineButtonStyle}>View My Tickets</button>
          <button onClick={onAnother} style={{ ...primaryButtonStyle, marginTop: 0 }}>Raise Another Ticket</button>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function FormGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function CategoryCard({ icon, label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: '1 1 140px', minWidth: 140,
        border: `1px solid ${active ? RED : 'var(--slate)'}`,
        background: active ? '#fff7f7' : 'var(--white)',
        color: active ? RED : 'var(--text-primary)',
        borderRadius: 8, padding: 16,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'center',
        transition: 'all 0.15s',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 22, color: active ? RED : 'var(--text-muted)' }}>
        {icon}
      </span>
      {label}
    </div>
  );
}

function PriorityCard({ priority, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
        border: `1.5px solid ${active ? priority.color : 'var(--slate)'}`,
        background: active ? priority.bg : 'var(--white)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 4,
        color: active ? priority.color : 'var(--text-primary)',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{priority.icon}</span>
        {priority.id}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{priority.desc}</div>
    </div>
  );
}

function DeviceCard({ device, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${active ? RED : 'var(--slate)'}`,
        background: active ? '#fff7f7' : 'var(--white)',
        borderRadius: 8, padding: 16,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        cursor: 'pointer', flex: '1 1 calc(33.333% - 8px)', minWidth: 160, maxWidth: 230,
        transition: 'all 0.15s', position: 'relative',
      }}
    >
      {active && (
        <span className="material-symbols-outlined" style={{
          position: 'absolute', top: 8, right: 8, color: RED, fontSize: 18,
        }}>
          check_circle
        </span>
      )}
      <span className="material-symbols-outlined" style={{ fontSize: 28, color: active ? RED : 'var(--text-muted)' }}>
        {device.icon}
      </span>
      <div style={{ fontWeight: 600, fontSize: 12, textAlign: 'center', color: 'var(--text-primary)' }}>
        {device.name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        SN: {device.serial}
      </div>
      <div style={{
        width: '100%', padding: 6, borderRadius: 6,
        fontSize: 11, fontWeight: 600, textAlign: 'center', marginTop: 4,
        border: `1px solid ${active ? RED : 'var(--slate)'}`,
        background: active ? RED : 'var(--white)',
        color: active ? '#fff' : 'var(--text-primary)',
      }}>
        {active ? 'SELECTED' : 'SELECT'}
      </div>
    </div>
  );
}

function AutofillPanel({ device }) {
  return (
    <div style={{
      background: '#fff7f7', border: '1px solid #fecaca', borderRadius: 8,
      padding: 16, marginBottom: 20,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: RED,
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
        Auto-filled from your asset records
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <FieldDisplay label="ASSET ID"        value={device.id} />
        <FieldDisplay label="SERIAL NUMBER"   value={device.serial} />
        <FieldDisplay label="ASSIGNED DATE"   value={device.date} />
        <FieldDisplay label="WARRANTY"        value={device.warranty} accent={GREEN} />
        <FieldDisplay label="CONDITION"       value={device.condition} />
      </div>
    </div>
  );
}

function FieldDisplay({ label, value, accent }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: accent || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6,
      }}>
        <span className="material-symbols-outlined" style={{ color: RED, fontSize: 18 }}>{icon}</span>
        {title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>
    </div>
  );
}

function RemoteCard({ remote, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, minWidth: 120,
        border: `1.5px solid ${active ? RED : 'var(--slate)'}`,
        background: active ? '#fff7f7' : 'var(--white)',
        borderRadius: 12, padding: '16px 12px', textAlign: 'center',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      <span className="material-symbols-outlined" style={{
        fontSize: 28, color: active ? RED : 'var(--text-muted)', marginBottom: 8, display: 'block',
      }}>
        {remote.icon}
      </span>
      <div style={{
        fontSize: 13, fontWeight: 700, marginBottom: 2,
        color: active ? RED : 'var(--text-primary)',
      }}>
        {remote.id}
      </div>
      <div style={{ fontSize: 11, color: active ? RED : 'var(--text-muted)' }}>
        {remote.sub}
      </div>
    </div>
  );
}

function TimeSlotCard({ slot, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px', borderRadius: 8, textAlign: 'center',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        border: `1.5px solid ${active ? '#2563eb' : 'var(--slate)'}`,
        background: active ? '#eff6ff' : 'var(--white)',
        color: active ? '#2563eb' : 'var(--text-primary)',
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}
    >
      {slot === 'Any Time' && (
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
      )}
      {slot}
    </div>
  );
}

function ReviewSection({ title, onEdit, children }) {
  return (
    <div style={{
      border: '1px solid var(--slate)', borderRadius: 8,
      padding: 16, marginBottom: 12,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {title}
        </div>
        <span onClick={onEdit} style={{ fontSize: 12, color: RED, cursor: 'pointer', fontWeight: 600 }}>
          Edit
        </span>
      </div>
      {children}
    </div>
  );
}

function ReviewBadge({ icon, label, value }) {
  return (
    <div style={{
      background: 'var(--off-white)', border: '1px solid var(--slate)',
      borderRadius: 8, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span className="material-symbols-outlined" style={{ color: RED, fontSize: 18 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STYLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const inputStyle = {
  width: '100%', border: '1px solid var(--slate)', borderRadius: 8,
  padding: '12px 16px', fontSize: 14, outline: 'none',
  fontFamily: 'DM Sans, sans-serif', background: 'var(--white)',
  color: 'var(--text-primary)', transition: 'border 0.18s',
};

const primaryButtonStyle = {
  width: '100%', padding: '14px', fontSize: 14, fontWeight: 700,
  background: RED, color: '#fff', border: 'none', borderRadius: 12,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  boxShadow: '0 6px 16px rgba(204,58,58,0.25)',
  fontFamily: 'DM Sans, sans-serif', marginTop: 12,
};

const outlineButtonStyle = {
  padding: '14px 22px', fontSize: 14, fontWeight: 600,
  background: 'var(--white)', color: 'var(--text-primary)',
  border: '1px solid var(--slate)', borderRadius: 12,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  fontFamily: 'DM Sans, sans-serif',
};
