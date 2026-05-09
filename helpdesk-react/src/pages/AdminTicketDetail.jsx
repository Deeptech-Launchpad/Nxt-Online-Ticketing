import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { showToast } from '../components/Toast';

const STATUS_OPTS   = ['open', 'in-progress', 'resolved', 'closed'];
const STATUS_LABELS = { open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved', closed: 'Closed' };
const PRIORITY_OPTS = ['Low', 'Medium', 'High', 'Very High'];

export default function AdminTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tickets, addMessage, setStatus, setResolution, updatePriority } = useApp();

  const [msgText, setMsgText] = useState('');
  const [resNote, setResNote] = useState('');
  const [closeModal, setCloseModal] = useState(false);

  const t = tickets.find(x => x.id === id);
  if (!t) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Ticket not found.</div>;

  const sendMsg = () => {
    if (!msgText.trim()) { showToast('Type a message first', 'error'); return; }
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    addMessage(t.id, { from: 'admin', name: `Suresh M.`, time: now, text: msgText });
    setMsgText('');
    showToast('Message sent', 'success');
  };

  const handleStatus = (s) => {
    setStatus(t.id, s);
    showToast('Status updated to ' + STATUS_LABELS[s], 'success');
  };

  const handleReopen = () => {
    setStatus(t.id, 'in-progress');
    showToast('Ticket reopened and set to In Progress', 'success');
  };

  const handlePriority = (p) => {
    updatePriority(t.id, p);
    showToast('Priority updated to ' + p, 'success');
  };

  const handleClose = () => {
    setResolution(t.id, resNote);
    setStatus(t.id, 'closed');
    setCloseModal(false);
    showToast('Ticket closed and employee notified', 'success');
  };

  // Calculate mock SLA and metrics
  const getSlaInfo = () => {
    if (t.priority === 'Very High') return { text: '2 Hours (Critical)', color: 'var(--danger)' };
    if (t.priority === 'High') return { text: '4 Hours', color: '#f97316' };
    return { text: '24 Hours', color: 'var(--text-primary)' };
  };
  const sla = getSlaInfo();

  return (
    <div className="page-fade">
      <div className="breadcrumb">
        <a onClick={() => navigate('/admin')}>All Tickets</a>
        <span className="breadcrumb-sep">›</span>
        <span>#{t.id}</span>
      </div>

      <div className="ticket-detail-grid">
        {/* Left */}
        <div>
          <div className="detail-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>#{t.id}</span>
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
              </div>
            </div>
            
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>{t.subject}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Raised by <strong style={{ color: 'var(--text-primary)' }}>{t.employeeName}</strong> · {t.category} · {t.createdAt}
            </div>
            <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-md)', padding: 14, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 16 }}>{t.desc}</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[['Division', t.division], ['Issue Category', t.category], ['Device', t.device || '—'], ['Remote', t.remote]].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>SLA Deadline</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: sla.color }}>{t.status === 'closed' || t.status === 'resolved' ? '—' : sla.text}</div>
              </div>
              {t.attachments && t.attachments.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>Attachment</div>
                  <div style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    📎 {t.attachments[0]}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="detail-card">
            <div className="detail-card-title">Action Taken</div>
            {t.messages.length === 0
              ? <div style={{ fontSize: 14, color: 'var(--text-muted)', padding: '12px 0' }}>No comments or logs yet.</div>
              : t.messages.map((m, i) => (
                <div key={i} className={`msg-bubble ${m.from === 'admin' ? 'msg-admin' : 'msg-employee'}`}>
                  <div className="msg-header">
                    <div className={`msg-avatar ${m.from === 'employee' ? 'emp' : ''}`}>{m.name.split(' ').map(n => n[0]).join('')}</div>
                    <span className="msg-name">{m.name}{m.from === 'admin' ? ' (Admin)' : ''}</span>
                    <span className="msg-time">{m.time}</span>
                  </div>
                  <div className="msg-text">{m.text}</div>
                </div>
              ))
            }
            {!['closed', 'resolved'].includes(t.status) ? (
              <div style={{ marginTop: 16 }}>
                <textarea className="resolution-textarea" rows={2} placeholder="Add a note or update the user…"
                  value={msgText} onChange={e => setMsgText(e.target.value)} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={sendMsg}>Add Comment</button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--success)', marginTop: 10, fontWeight: 500 }}>✓ Ticket is {t.status === 'resolved' ? 'marked as resolved' : 'permanently closed'}.</div>
            )}
          </div>
        </div>

        {/* Right side admin actions */}
        <div>
          <div className="detail-card">
            <div className="detail-card-title">Quick Actions</div>
            
            {t.status === 'closed' || t.status === 'resolved' ? (
              <div style={{ background: 'var(--off-white)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>Resolution Met</div>
                {t.resolvedAt && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Resolved at: {t.resolvedAt}
                  </div>
                )}
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 12 }}>
                  <strong>Note:</strong> {t.resolutionNote || 'No notes left.'}
                </div>
                <button className="btn btn-sm btn-block" style={{ background: '#fff', border: '1px solid var(--slate)' }} onClick={handleReopen}>
                  Reopen Ticket
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label-light">Update Priority</label>
                  <select className="form-select-light" value={t.priority} onChange={e => handlePriority(e.target.value)}>
                    {PRIORITY_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button 
                    className="btn btn-outline btn-block" 
                    style={{ background: 'var(--white)', color: '#2563eb', borderColor: '#2563eb' }}
                    onClick={() => handleStatus('in-progress')}
                    disabled={t.status === 'in-progress'}
                  >
                    {t.status === 'in-progress' ? 'Currently In Progress' : 'Mark In Progress'}
                  </button>

                  <button className="btn btn-success btn-block" onClick={() => setCloseModal(true)}>
                    Resolve & Close
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="detail-card">
            <div className="detail-card-title">Employee Summary</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div className="avatar" style={{ width: 40, height: 40, fontSize: 15, background: 'var(--navy)' }}>
                {t.employeeName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--navy)' }}>{t.employeeName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.employeeId || '—'}</div>
              </div>
            </div>
            {[['Division', t.division], ['Category', t.category], ['Remote', t.remote]].map(([k, v]) => (
              <div key={k} className="info-row"><span className="info-key">{k}</span><span className="info-val">{v}</span></div>
            ))}
          </div>

          <div className="detail-card">
            <div className="detail-card-title">Ticket Timeline</div>
            {t.history.map((h, i) => (
              <div key={i} className="history-item">
                <span className="history-label">{h.label}</span>
                <span className="history-time">{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={closeModal}
        title="Resolve & Close Ticket"
        onCancel={() => setCloseModal(false)}
        onConfirm={handleClose}
        confirmText="Confirm Resolution"
        confirmClass="btn btn-success"
      >
        <div style={{ padding: '0 20px 20px 20px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Please write a short note about how you resolved this issue before closing it out.
          </p>
          <textarea className="resolution-textarea" rows={3}
            placeholder="Document resolution steps…"
            value={resNote} onChange={e => setResNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
