import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { showToast } from '../components/Toast';

export default function EmployeeTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tickets, currentUser, addMessage, setStatus } = useApp();
  const [reply, setReply] = useState('');

  const handleReopen = () => {
    setStatus(t.id, 'reopened');
    addMessage(t.id, { from: 'employee', name: currentUser.name, time: 'Just now', text: 'Ticket reopened by employee.' });
    showToast('Ticket reopened', 'success');
  };

  const t = tickets.find(x => x.id === id);
  if (!t) return <div style={{padding:40,color:'var(--text-muted)'}}>Ticket not found.</div>;

  // Map ticket status to correct step index (0=Submitted, 1=Assigned, 2=InProgress, 3=Resolved)
  const getActiveIdx = () => {
    if (t.status === 'closed')                        return 4; // all steps done
    if (t.status === 'resolved')                      return 3; // Resolved & Closed is current
    if (t.status === 'in-progress')                   return 2; // In Progress is current
    if (t.status === 'open' && t.assignedTo)          return 1; // Assigned to Admin is current
    return 0;                                                    // Submitted is current
  };
  const activeIdx = getActiveIdx();

  const stepTimes = [
    t.history[0]?.time || '',
    t.history.find(h => h.label.toLowerCase().includes('assign'))?.time || '',
    t.inProgressAt ? t.inProgressAt.split(',')[1]?.trim() : (t.history.find(h => h.label.toLowerCase().includes('progress'))?.time || ''),
    t.resolvedAt   ? t.resolvedAt.split(',')[1]?.trim()   : (t.history.find(h => h.label.toLowerCase().includes('resolv'))?.time  || ''),
  ];
  const steps = ['Submitted', 'Assigned to Admin', 'In Progress', 'Resolved & Closed'];

  const getResolutionTime = (t) => {
    if (!t.inProgressAt || (t.status !== 'closed' && t.status !== 'resolved')) return null;
    const start = new Date(t.inProgressAt.replace(',', '')).getTime();
    const end = new Date(t.resolvedAt.replace(',', '')).getTime();
    if (!start || !end || end < start) return null;
    const diffMins = Math.floor((end - start) / 60000);
    if (diffMins < 60) return `${diffMins} mins`;
    const hours = Math.floor(diffMins / 60);
    const remain = diffMins % 60;
    return remain > 0 ? `${hours}h ${remain}m` : `${hours}h`;
  };

  const sendReply = () => {
    if (!reply.trim()) { showToast('Type a message first', 'error'); return; }
    addMessage(t.id, { from:'employee', name: currentUser.name, time:'Just now', text: reply });
    setReply('');
    showToast('Reply sent', 'success');
  };

  return (
    <div className="page-fade">
      <div className="breadcrumb">
        <a onClick={()=>navigate('/dashboard')}>Dashboard</a>
        <span className="breadcrumb-sep">›</span>
        <span>#{t.id}</span>
      </div>

      <div className="ticket-detail-grid">
        {/* Left */}
        <div>
          <div className="detail-card">
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:13,fontFamily:"'DM Mono',monospace",color:'var(--text-muted)'}}>#{t.id}</span>
              <StatusBadge status={t.status}/> <PriorityBadge priority={t.priority}/>
            </div>
            <div style={{fontSize:19,fontWeight:600,color:'var(--navy)',marginBottom:6}}>{t.subject}</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>Raised on {t.createdAt} · {t.category} · Remote: {t.remote}</div>
            <div style={{background:'var(--off-white)',borderRadius:'var(--radius-md)',padding:14,fontSize:15,color:'var(--text-primary)',lineHeight:1.7}}>{t.desc}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:16}}>
              {[['Division',t.division],['Issue Category',t.category],['Device',t.device||'—'],['Assigned to',t.assignedTo||'Unassigned'],['Remote',t.remote]].map(([k,v])=>(
                <div key={k}>
                  <div style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:14,fontWeight:500,color:'var(--text-primary)'}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="detail-card">
            <div className="detail-card-title">Progress Tracker</div>
            <div className="progress-track">
              {steps.map((s, i) => {
                const done    = i < activeIdx;
                const current = i === activeIdx && t.status !== 'closed';
                const pending = i > activeIdx;
                return (
                  <div key={s} className="progress-step">
                    <div className="progress-step-left">
                      <div className={`progress-dot ${done ? 'done' : current ? 'current' : 'pending'}`}>
                        {done    && <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={11} height={11}><path d="M2 6l3 3 5-5"/></svg>}
                        {current && <div style={{width:8,height:8,borderRadius:'50%',background:'white'}}/>}
                      </div>
                      {i < steps.length - 1 && <div className={`progress-connector ${done ? 'done' : ''}`}/>}
                    </div>
                    <div className="progress-content">
                      <div className={`progress-content-title ${current ? 'current' : ''}`}>{s}</div>
                      <div className="progress-content-sub">
                        {done || current ? (stepTimes[i] || '') : (pending ? 'Pending' : '')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          <div className="detail-card">
            <div className="detail-card-title">Messages</div>
            {t.messages.length===0
              ? <div style={{fontSize:14,color:'var(--text-muted)',padding:'12px 0'}}>No messages yet. The admin will contact you here.</div>
              : t.messages.map((m,i)=>(
                <div key={i} className={`msg-bubble ${m.from==='admin'?'msg-admin':'msg-employee'}`}>
                  <div className="msg-header">
                    <div className={`msg-avatar ${m.from==='employee'?'emp':''}`}>{m.name.split(' ').map(n=>n[0]).join('')}</div>
                    <span className="msg-name">{m.name}{m.from==='admin'?' (Admin)':''}</span>
                    <span className="msg-time">{m.time}</span>
                  </div>
                  <div className="msg-text">{m.text}</div>
                </div>
              ))
            }
            {!['closed', 'resolved'].includes(t.status) ? (
              <div style={{marginTop:12}}>
                <textarea className="resolution-textarea" rows={2} placeholder="Write a reply to admin…"
                  value={reply} onChange={e=>setReply(e.target.value)}/>
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
                  <button className="btn btn-primary btn-sm" onClick={sendReply}>Send Reply</button>
                </div>
              </div>
            ) : (
              <div style={{marginTop:16, padding: '16px', background: 'var(--off-white)', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate)'}}>
                <div style={{fontSize: 14, color: 'var(--navy)', fontWeight: 600, marginBottom: 6}}>Issue not resolved?</div>
                <div style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 14}}>If you are still experiencing the same problem, you can reopen this ticket to notify the admin.</div>
                <button className="btn btn-outline" style={{borderColor: 'var(--blue)', color: 'var(--blue)'}} onClick={handleReopen}>
                  Reopen Ticket
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          <div className="detail-card">
            <div className="detail-card-title">Ticket Info</div>
            {[
              ['Ticket ID','#'+t.id],
              ['Status',t.status],
              ['Priority',t.priority],
              ['Category',t.category],
              ['Division',t.division],
              ['Remote tool',t.remote],
              t.assignedTo ? ['Assigned To', t.assignedTo] : null,
              getResolutionTime(t) ? ['Resolution Time', getResolutionTime(t)] : null
            ].filter(Boolean).map(([k,v])=>(
              <div key={k} className="info-row">
                <span className="info-key">{k}</span>
                <span className="info-val">{v}</span>
              </div>
            ))}
          </div>
          <div className="detail-card">
            <div className="detail-card-title">Timeline</div>
            {t.history.map((h,i)=>(
              <div key={i} className="history-item">
                <span className="history-label">{h.label}</span>
                <span className="history-time">{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
