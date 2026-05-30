import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/Modal';
import { showToast } from '../components/Toast';

const RED   = '#CC3A3A';
const NAVY  = '#02172E';
const GREEN = '#16a34a';
const AMBER = '#F59E0B';

const PRIORITY_PILL = {
  'Very High': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'HIGH' },
  High:        { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'HIGH' },
  Medium:      { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'MEDIUM' },
  Low:         { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'LOW' },
};

// Closing the ticket is only possible via the "Mark as Resolved" button
// (which forces a resolution note). The dropdown only handles active states.
const STATUS_OPTS = [
  { v: 'open',        label: 'Open' },
  { v: 'in-progress', label: 'In Progress' },
];

export default function AdminTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tickets, currentUser, addMessage, setStatus, setResolution, updatePriority, refreshTickets } = useApp();

  const [reply, setReply] = useState('');
  const [closeModal, setCloseModal] = useState(false);
  const [resNote, setResNote] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  // Guard against double-fire of the resolve action (double-click on Confirm,
  // network retry, React batching, etc.) — without this each extra call
  // creates another "has been resolved" notification for the employee.
  // Use a ref (synchronous) instead of useState to also catch fast double-clicks
  // that happen before React re-renders.
  const resolvingRef = useRef(false);

  const t = tickets.find(x => x.id === id);

  // Always refetch when opening a ticket so the conversation is fresh —
  // notification poller does background polling, but the first view should
  // never show stale data.
  useEffect(() => {
    refreshTickets();
  }, [id]);

  // Load private admin notes from localStorage (stored per ticket id, not yet in DB)
  useEffect(() => {
    if (!id) return;
    const saved = localStorage.getItem(`admin_private_notes_${id}`);
    setPrivateNotes(saved || '');
  }, [id]);

  if (!t) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, display: 'block', marginBottom: 12 }}>error_outline</span>
        Ticket not found.
      </div>
    );
  }

  const priStyle = PRIORITY_PILL[t.priority] || PRIORITY_PILL.Low;
  const isClosed = ['resolved', 'closed'].includes(t.status);

  /* â”€â”€ Timeline state â”€â”€ */
  const getActiveIdx = () => {
    if (t.status === 'closed' || t.status === 'resolved') return 3;
    if (t.status === 'in-progress') return 2;
    if (t.status === 'open' && t.assignedTo) return 1;
    return 0;
  };
  const activeIdx = getActiveIdx();

  const timeline = [
    { label: 'Ticket Created',          time: t.createdAt,                                                         state: activeIdx > 0 ? 'done' : 'active' },
    { label: t.assignedTo ? `Assigned to ${t.assignedTo}` : 'Awaiting Assignment',  time: t.assignedTo ? '-' : 'Pending',                                state: activeIdx > 1 ? 'done' : (activeIdx === 1 ? 'active' : 'pending') },
    { label: 'Status changed to In Progress', time: t.inProgressAt || 'Pending',                                  state: activeIdx > 2 ? 'done' : (activeIdx === 2 ? 'active' : 'pending') },
    { label: 'Resolution',              time: t.resolvedAt || 'Pending',                                          state: activeIdx === 3 ? 'done' : 'pending' },
  ];

  /* â”€â”€ Actions â”€â”€ */
  const sendReply = () => {
    if (!reply.trim()) { showToast('Type a message first', 'error'); return; }
    addMessage(t.id, { from: 'admin', name: currentUser?.name || 'Admin', time: 'Just now', text: reply });
    setReply('');
    showToast('Reply sent', 'success');
  };

  const handleStatusChange = (s) => {
    setStatus(t.id, s);
    showToast(`Status updated to ${STATUS_OPTS.find(x => x.v === s)?.label || s}`, 'success');
  };

  const handlePriority = (p) => {
    updatePriority(t.id, p);
    showToast(`Priority set to ${p}`, 'success');
  };

  const handleResolve = async () => {
    if (resolvingRef.current) return;          // already in flight → ignore extra clicks
    const note = resNote.trim();
    if (!note) {
      showToast('Please write a short note about the action you took.', 'error');
      return;
    }
    resolvingRef.current = true;
    try {
      // One PUT does both: sets status='resolved' AND saves the note.
      await setResolution(t.id, note);
      setCloseModal(false);
      setResNote('');
      showToast('Ticket resolved and employee notified', 'success');
    } finally {
      resolvingRef.current = false;
    }
  };

  const handleReopen = () => {
    setStatus(t.id, 'in-progress');
    showToast('Ticket reopened and set to In Progress', 'success');
  };

  const savePrivateNotes = () => {
    localStorage.setItem(`admin_private_notes_${id}`, privateNotes);
    showToast('Private notes saved (local only)', 'success');
  };

  /* â”€â”€ Linked asset placeholder (parsed from device string) â”€â”€ */
  const linkedAsset = parseDevice(t.device);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* BREADCRUMB */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
        <a onClick={() => navigate('/admin/tickets')} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>All Tickets</a>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        <span>{t.id}</span>
      </div>

      {/* HEADER BAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{
          background: '#f0fdf4', color: GREEN, border: '1px solid #bbf7d0',
          padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
          fontFamily: 'DM Mono, monospace',
        }}>
          {t.id}
        </span>
        <h1 style={{
          fontSize: 20, fontWeight: 700, flex: 1,
          color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif',
          minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {t.subject}
        </h1>

        {/* Status dropdown */}
        <select
          value={t.status}
          onChange={e => handleStatusChange(e.target.value)}
          disabled={isClosed}
          style={{
            padding: '8px 32px 8px 12px', borderRadius: 8,
            border: '1px solid var(--slate)', background: 'var(--white)',
            fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
          }}
        >
          {STATUS_OPTS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>

        {/* Priority pill */}
        <span style={{
          padding: '6px 14px', borderRadius: 20,
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
          color: priStyle.color, background: priStyle.bg, border: `1px solid ${priStyle.border}`,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
          {priStyle.label}
        </span>

        {/* Action button */}
        {isClosed ? (
          <button
            onClick={handleReopen}
            style={{
              padding: '10px 18px', background: 'var(--white)', color: RED, border: `1px solid ${RED}`,
              borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Reopen
          </button>
        ) : (
          <button
            onClick={() => setCloseModal(true)}
            style={{
              padding: '10px 18px', background: GREEN, color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(22,163,74,0.25)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            Mark as Resolved
          </button>
        )}
      </div>

      {/* TWO-COL LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
        {/* MAIN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* Issue Description */}
          <SectionCard>
            <SectionTitle icon="subject">Issue Description</SectionTitle>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: 14 }}>
              {t.desc}
            </p>
            {(t.deviceNotes || t.preferredTime) && (
              <div style={{ marginBottom: 14, paddingTop: 10, borderTop: '1px solid var(--slate)' }}>
                {t.deviceNotes && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Device Notes</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t.deviceNotes}</div>
                  </div>
                )}
                {t.preferredTime && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Preferred Contact Time</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t.preferredTime}</div>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 24, paddingTop: 12, borderTop: '1px solid var(--slate)', flexWrap: 'wrap' }}>
              <Meta label="Category" value={t.category || 'General'} icon="folder" />
              <Meta label="Affected Device" value={t.device || '-'} icon="laptop" valueColor={GREEN} />
              <Meta label="Remote" value={t.remote || 'In Person'} icon="desktop_windows" />
            </div>
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
                No attachments uploaded by the employee.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {t.attachments.map(a => (
                  <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                     style={{
                       display: 'flex', alignItems: 'center', gap: 12,
                       padding: '12px 14px', borderRadius: 8,
                       background: 'var(--off-white)', border: '1px solid var(--slate)',
                       textDecoration: 'none', color: 'var(--text-primary)', cursor: 'pointer',
                     }}
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
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {a.size ? `${Math.round(a.size / 1024)} KB · ` : ''}Click to view
                      </div>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: RED }}>open_in_new</span>
                  </a>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Action Taken — only shown when ticket is resolved/closed and a note exists */}
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

          {/* Conversation */}
          <SectionCard>
            <SectionTitle icon="chat_bubble_outline">Conversation</SectionTitle>

            {t.messages.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
                No messages yet. Start the conversation below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {t.messages.map((m, i) => (
                  <MessageBubble key={i} msg={m} self={m.from === 'admin'} />
                ))}
              </div>
            )}

            {!isClosed ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 13, margin: '16px 0 10px', color: 'var(--text-primary)' }}>
                  Reply to {t.employeeName || 'Employee'}
                </div>
                <div style={{
                  border: '1px solid var(--slate)', borderRadius: 8, overflow: 'hidden',
                }}>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type your response here..."
                    style={{
                      border: 'none', outline: 'none', padding: '12px 14px', width: '100%',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 13, resize: 'none', minHeight: 100,
                      background: 'transparent', color: 'var(--text-primary)',
                    }}
                  />
                  <div style={{
                    padding: '8px 12px', borderTop: '1px solid var(--slate)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>attach_file</span>
                      <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>image</span>
                      <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>link</span>
                    </div>
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
                      Send Reply
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
                fontSize: 13, color: GREEN, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                This ticket is {t.status === 'closed' ? 'permanently closed' : 'marked as resolved'}. Reopen to continue the conversation.
              </div>
            )}
          </SectionCard>

          {/* Private Admin Notes */}
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#d97706',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span>
                Private Admin Notes
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#d97706',
                background: '#fef3c7', padding: '2px 8px', borderRadius: 4,
              }}>
                NOT VISIBLE TO EMPLOYEE
              </span>
            </div>
            <textarea
              value={privateNotes}
              onChange={e => setPrivateNotes(e.target.value)}
              placeholder="Add internal notes here..."
              style={{
                width: '100%', border: 'none', background: 'transparent',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                color: 'var(--text-primary)', resize: 'vertical', outline: 'none',
                minHeight: 60,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 10, color: '#92400e', opacity: 0.7 }}>
                Stored locally in your browser (backend wiring coming in next phase)
              </span>
              <button
                onClick={savePrivateNotes}
                style={{
                  background: '#d97706', color: '#fff', border: 'none',
                  padding: '6px 14px', borderRadius: 6,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Requester Info */}
          <SectionCard>
            <SectionTitle icon="person_outline">Requester Info</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: `linear-gradient(135deg, ${RED}, ${NAVY})`,
                color: '#fff', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontFamily: 'DM Sans, sans-serif',
              }}>
                {(t.employeeName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t.employeeName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.dept || 'Employee'}</div>
              </div>
            </div>
            <InfoRow label="Employee ID" value={t.employeeId} />
            <InfoRow label="Division"    value={t.division || '-'} />
            <InfoRow label="Department"  value={t.dept || '-'} />
            <a style={{
              fontSize: 12, color: RED, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, marginTop: 10,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
              View All Tickets by this Employee
            </a>
          </SectionCard>

          {/* Linked Asset */}
          <SectionCard>
            <SectionTitle icon="laptop">Linked Asset</SectionTitle>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--off-white)', borderRadius: 8, padding: 12, marginBottom: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: '#f0fdf4', color: GREEN,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>laptop</span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{linkedAsset.id}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{linkedAsset.name}</div>
              </div>
            </div>
            <InfoRow label="Serial"    value={linkedAsset.serial || '-'} />
            <InfoRow label="Warranty"  value={linkedAsset.warranty || 'Unknown'} accent={GREEN} />
            <InfoRow label="Condition" value={linkedAsset.condition || 'Unknown'} />
          </SectionCard>

          {/* Ticket Timeline */}
          <SectionCard>
            <SectionTitle icon="timeline">Ticket Timeline</SectionTitle>
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

          {/* Priority quick action */}
          {!isClosed && (
            <SectionCard>
              <SectionTitle icon="flag">Update Priority</SectionTitle>
              <select
                value={t.priority || 'Medium'}
                onChange={e => handlePriority(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--slate)', background: 'var(--white)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none',
                }}
              >
                {['Low', 'Medium', 'High', 'Very High'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Resolve modal */}
      <Modal
        open={closeModal}
        title="Resolve & Close Ticket"
        onCancel={() => setCloseModal(false)}
        onConfirm={handleResolve}
        confirmText="Confirm Resolution"
        confirmClass="btn btn-success"
      >
        <div style={{ padding: '0 20px 20px 20px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Describe the action you took to resolve this issue. The employee
            will see this note when they view the ticket. <span style={{ color: 'var(--danger)', fontWeight: 700 }}>*</span>
          </p>
          <textarea className="resolution-textarea" rows={4}
            placeholder="e.g. Replaced the laptop battery and reinstalled Windows updates. Verified the system boots and runs normally."
            value={resNote} onChange={e => setResNote(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* Parse a device string like "Dell Latitude 5520 (AST-2022-094)" into parts */
function parseDevice(deviceStr) {
  if (!deviceStr) return { name: '-', id: '-', serial: null, warranty: null, condition: null };
  const m = deviceStr.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (m) {
    return {
      name: m[1].trim(),
      id: m[2].trim(),
      serial: null,        // Full asset lookup not yet wired
      warranty: null,
      condition: null,
    };
  }
  return { name: deviceStr, id: '-', serial: null, warranty: null, condition: null };
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ COMPONENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

function Meta({ label, value, icon, valueColor }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontWeight: 600, fontSize: 13,
        color: valueColor || 'var(--text-primary)',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
        {value}
      </div>
    </div>
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

function InfoRow({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{label}</span>
      <span style={{ color: accent ? accent : 'var(--text-primary)', fontWeight: accent ? 600 : 500 }}>
        {value}
      </span>
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
      {!isLast && (
        <div style={{
          position: 'absolute', left: 11, top: 24, bottom: 0, width: 2,
          background: state === 'done' ? RED : 'var(--slate)',
        }} />
      )}
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
