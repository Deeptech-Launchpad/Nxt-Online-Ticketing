import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, formatIST } from '../context/AppContext';
import { showToast } from '../components/Toast';

const RED   = '#CC3A3A';
const NAVY  = '#02172E';
const GREEN = '#16a34a';
const AMBER = '#F59E0B';

const PRIORITY_PILL = {
  'Very High': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'HIGH PRIORITY' },
  High:        { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'HIGH PRIORITY' },
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

export default function EmployeeTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tickets, currentUser, addMessage, setStatus, refreshTickets } = useApp();
  const [reply, setReply] = useState('');

  // Always refetch when opening — first view should never show stale messages.
  useEffect(() => {
    refreshTickets();
  }, [id]);

  const t = tickets.find(x => x.id === id);
  if (!t) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, display: 'block', marginBottom: 12 }}>error_outline</span>
        Ticket not found.
      </div>
    );
  }

  const priStyle = PRIORITY_PILL[t.priority] || PRIORITY_PILL.Low;
  const stStyle  = STATUS_PILL[t.status] || STATUS_PILL.open;

  // Timeline state
  const getActiveIdx = () => {
    if (t.status === 'closed' || t.status === 'resolved') return 3;
    if (t.status === 'in-progress')   return 2;
    if (t.status === 'open' && t.assignedTo) return 1;
    return 0;
  };
  const activeIdx = getActiveIdx();

  const sendReply = () => {
    if (!reply.trim()) { showToast('Type a message first', 'error'); return; }
    addMessage(t.id, { from: 'employee', name: currentUser.name, time: formatIST(new Date()), text: reply });
    setReply('');
    showToast('Reply sent', 'success');
  };

  const handleReopen = () => {
    setStatus(t.id, 'reopened');
    addMessage(t.id, { from: 'employee', name: currentUser.name, time: formatIST(new Date()), text: 'Ticket reopened by employee.' });
    showToast('Ticket reopened', 'success');
  };

  const isClosed = ['closed', 'resolved'].includes(t.status);

  // Timeline items
  const timeline = [
    { label: 'Submitted',          time: t.createdAt,    state: activeIdx > 0 ? 'done' : (activeIdx === 0 ? 'active' : 'pending') },
    { label: 'Assigned to Admin',  time: t.assignedTo ? (t.history.find(h => h.label.toLowerCase().includes('assign'))?.time || '-') : 'Pending', state: activeIdx > 1 ? 'done' : (activeIdx === 1 ? 'active' : 'pending') },
    { label: 'In Progress',        time: t.inProgressAt || 'Pending', state: activeIdx > 2 ? 'done' : (activeIdx === 2 ? 'active' : 'pending') },
    { label: 'Resolved',           time: t.resolvedAt   || 'Pending', state: activeIdx === 3 ? 'done' : 'pending' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* BREADCRUMB */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: 'var(--text-muted)', marginBottom: 18,
      }}>
        <a onClick={() => navigate('/history')} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>My Tickets</a>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        <span>{t.id}</span>
      </div>

      {/* TWO-COL LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28 }}>
        {/* MAIN COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* Header card */}
          <SectionCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{
                background: '#f0fdf4', color: GREEN, border: '1px solid #bbf7d0',
                padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                fontFamily: 'DM Mono, monospace',
              }}>
                {t.id}
              </span>
              <Pill {...priStyle}>
                <span className="material-symbols-outlined" style={{ fontSize: 12, marginRight: 4 }}>warning</span>
                {priStyle.label}
              </Pill>
              <Pill {...stStyle}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: stStyle.color, display: 'inline-block', marginRight: 4 }} />
                {stStyle.label}
              </Pill>
            </div>
            <h2 style={{
              fontSize: 20, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              {t.subject}
            </h2>
            <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Category:</span>&nbsp;<strong>{t.category || 'General'}</strong>
              </span>
              <span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Device:</span>&nbsp;<strong>{t.device || '-'}</strong>
              </span>
              <span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Remote:</span>&nbsp;<strong>{t.remote || 'In Person'}</strong>
              </span>
            </div>
          </SectionCard>

          {/* Description */}
          <SectionCard>
            <SectionTitle icon="subject">Issue Description</SectionTitle>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)' }}>
              {t.desc}
            </p>
            {t.deviceNotes && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--slate)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  Notes about the device
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>{t.deviceNotes}</p>
              </div>
            )}
            {t.preferredTime && (
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Preferred contact time:</strong> {t.preferredTime}
              </div>
            )}
          </SectionCard>

          {/* Attachments */}
          <SectionCard>
            <SectionTitle icon="image">Attachments</SectionTitle>
            {(!t.attachments || t.attachments.length === 0) ? (
              <div style={{
                fontSize: 12, color: 'var(--text-muted)', padding: '14px 18px',
                background: 'var(--off-white)', border: '1px dashed var(--slate)', borderRadius: 8,
                textAlign: 'center',
              }}>
                No attachments uploaded for this ticket.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {t.attachments.map(a => (
                  <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                     style={{
                       display: 'flex', alignItems: 'center', gap: 12,
                       padding: '12px 14px', borderRadius: 8,
                       background: 'var(--off-white)', border: '1px solid var(--slate)',
                       textDecoration: 'none', color: 'var(--text-primary)',
                       cursor: 'pointer', transition: 'all 0.15s',
                     }}
                     onMouseEnter={e => { e.currentTarget.style.borderColor = RED; }}
                     onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--slate)'; }}
                  >
                    <div style={{
                      width: 36, height: 36, background: '#e5e7eb', borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)' }}>
                        {(a.mimeType || '').startsWith('image/') ? 'image' : 'description'}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.fileName}</div>
                      <div style={{ fontSize: 11, color: RED }}>View / Download â†’</div>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: RED }}>open_in_new</span>
                  </a>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Action Taken — shown when ticket is resolved/closed and a note exists */}
          {['resolved', 'closed'].includes(t.status) && t.resolutionNote && (
            <SectionCard style={{
              borderLeft: '4px solid var(--success, #16a34a)',
              background: 'rgba(22, 163, 74, 0.04)',
            }}>
              <SectionTitle icon="task_alt">Action Taken</SectionTitle>
              <div style={{
                fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                padding: '4px 0 8px',
              }}>
                {t.resolutionNote}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text-muted)',
                borderTop: '1px solid rgba(22,163,74,0.15)', paddingTop: 10, marginTop: 6,
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--success, #16a34a)' }}>
                  check_circle
                </span>
                Resolved
                {t.assignedTo && <> by <strong style={{ color: 'var(--text-primary)' }}>{t.assignedTo}</strong></>}
                {t.resolvedAt && <> · {t.resolvedAt}</>}
              </div>
            </SectionCard>
          )}

          {/* Updates and Communication */}
          <SectionCard>
            <SectionTitle icon="chat_bubble_outline">Updates and Communication</SectionTitle>

            {t.messages.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
                No messages yet. The admin will contact you here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {t.messages.map((m, i) => (
                  <MessageBubble key={i} msg={m} self={m.from === 'employee'} />
                ))}
              </div>
            )}

            {!isClosed ? (
              <div style={{
                marginTop: 14, border: '1px solid var(--slate)', borderRadius: 8, overflow: 'hidden',
              }}>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Type your reply here..."
                  style={{
                    border: 'none', outline: 'none', padding: '12px 14px', width: '100%',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, resize: 'none', minHeight: 80,
                    background: 'transparent', color: 'var(--text-primary)',
                  }}
                />
                <div style={{
                  padding: '8px 12px', borderTop: '1px solid var(--slate)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>
                    attach_file
                  </span>
                  <button
                    onClick={sendReply}
                    style={{
                      background: RED, color: '#fff', border: 'none',
                      padding: '8px 16px', borderRadius: 8,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>send</span>
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: 16, padding: 16, background: 'var(--off-white)',
                borderRadius: 8, border: '1px solid var(--slate)',
              }}>
                <div style={{ fontSize: 14, color: NAVY, fontWeight: 600, marginBottom: 6 }}>
                  Issue not resolved?
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                  If you are still experiencing the same problem, you can reopen this ticket.
                </div>
                <button
                  onClick={handleReopen}
                  style={{
                    background: 'transparent', color: RED, border: `1px solid ${RED}`,
                    padding: '8px 16px', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Reopen Ticket
                </button>
              </div>
            )}
          </SectionCard>
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Ticket Status */}
          <SectionCard>
            <SectionTitle icon="timeline">Ticket Status</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {timeline.map((item, i) => (
                <TimelineItem
                  key={i}
                  label={item.label}
                  time={item.time}
                  state={item.state}
                  isLast={i === timeline.length - 1}
                />
              ))}
            </div>
          </SectionCard>

          {/* Ticket Info */}
          <SectionCard>
            <SectionTitle icon="info">Ticket Info</SectionTitle>
            <InfoRow label="CREATED"             value={t.createdAt} />
            <InfoRow label="LAST UPDATED"        value={t.updatedAt || t.createdAt} />
            <InfoRow label="ASSIGNED TO"         value={t.assignedTo || 'Unassigned'} accent={!!t.assignedTo} />
            {t.resolvedAt && <InfoRow label="RESOLVED" value={t.resolvedAt} />}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€ COMPONENTS â”€â”€ */

function SectionCard({ children, style }) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 12,
      border: '1px solid var(--slate)', padding: 24,
      boxShadow: 'var(--shadow-sm)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, marginBottom: 14,
      display: 'flex', alignItems: 'center', gap: 6,
      color: 'var(--text-primary)',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: RED }}>{icon}</span>
      {children}
    </div>
  );
}

function Pill({ bg, color, border, children }) {
  return (
    <span style={{
      padding: '5px 12px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      color, background: bg, border: `1px solid ${border}`,
      display: 'inline-flex', alignItems: 'center',
    }}>
      {children}
    </span>
  );
}

function MessageBubble({ msg, self }) {
  const initials = (msg.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      display: 'flex', gap: 10,
      flexDirection: self ? 'row-reverse' : 'row',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: self ? RED : '#6366f1',
        color: '#fff', fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {initials}
      </div>
      <div style={{ maxWidth: '75%' }}>
        <div style={{
          fontSize: 11, color: 'var(--text-muted)',
          marginBottom: 4, textAlign: self ? 'right' : 'left',
        }}>
          {self ? 'You' : msg.name} · {msg.time}
        </div>
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: self ? '#fff7f7' : 'var(--off-white)',
          border: `1px solid ${self ? '#fee2e2' : 'var(--slate)'}`,
          fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)',
        }}>
          {msg.text}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, time, state, isLast }) {
  const dotProps = {
    done:    { bg: RED,         border: 'none', icon: 'check' },
    active:  { bg: 'var(--white)', border: `2px solid ${RED}`, inner: RED },
    pending: { bg: 'var(--white)', border: '2px solid var(--slate)', inner: 'var(--slate)' },
  }[state];

  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 16, position: 'relative' }}>
      {/* connector line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 11, top: 24, bottom: 0, width: 2,
          background: state === 'done' ? RED : 'var(--slate)',
        }} />
      )}
      {/* dot */}
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: dotProps.bg,
        border: dotProps.border,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, zIndex: 1, position: 'relative',
      }}>
        {dotProps.icon && (
          <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 14 }}>{dotProps.icon}</span>
        )}
        {dotProps.inner && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotProps.inner }} />
        )}
      </div>
      {/* body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 13,
          color: state === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 11, marginTop: 2,
          color: state === 'done' || state === 'active' ? RED : 'var(--text-muted)',
        }}>
          {state === 'pending' ? 'Pending' : (time || '-')}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{label}</span>
      <span style={{ color: accent ? RED : 'var(--text-primary)', fontWeight: accent ? 600 : 500 }}>
        {value}
      </span>
    </div>
  );
}
