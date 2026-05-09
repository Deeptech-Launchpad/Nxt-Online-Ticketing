import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { showToast } from '../components/Toast';
import CustomSelect from '../components/CustomSelect';

const DIVISIONS = ['Guntur -AndhraPradesh', 'RS Puram Coimbatore', 'Saibaba Colony-Coimbatore', 'Thudiyalur-coimbatore', 'WFH'];
const CATS     = ['Hardware','Software','Network','Access / Login','Email','Printer','Other'];
const REMOTES  = [
  { key:'In Person',  label:'In Person',  sub:'On-site visit', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={16} height={16}><circle cx="8" cy="5" r="2.5"/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" strokeLinecap="round"/></svg> },
  { key:'Over Phone', label:'Over Phone', sub:'Call support',   icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={16} height={16}><path d="M3 2h3l1.5 3-2 1.5a8.4 8.4 0 004 4L11 9l3 1.5V13a1 1 0 01-1 1C7.5 14 2 8.5 2 3a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { key:'AnyDesk',    label:'AnyDesk',    sub:'Fast & light',  icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={16} height={16}><rect x="1" y="3" width="14" height="9" rx="2"/><line x1="5" y1="12" x2="5" y2="14" strokeLinecap="round"/><line x1="11" y1="12" x2="11" y2="14" strokeLinecap="round"/><line x1="3" y1="14" x2="13" y2="14" strokeLinecap="round"/></svg> },
  { key:'UltraViewer',label:'UltraViewer',sub:'Simple',        icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={16} height={16}><rect x="1" y="3" width="14" height="9" rx="2"/><circle cx="8" cy="7.5" r="2.5"/></svg> },
  { key:'TeamViewer', label:'TeamViewer', sub:'Enterprise',    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={16} height={16}><rect x="1" y="3" width="14" height="9" rx="2"/><line x1="5" y1="7.5" x2="11" y2="7.5" strokeLinecap="round"/><line x1="8" y1="4.5" x2="8" y2="10.5" strokeLinecap="round"/></svg> },
];

function StepCircle({ n, step }) {
  const state = n < step ? 'done' : n === step ? 'current' : 'todo';
  return (
    <div className={`step-circle ${state}`}>
      {state === 'done'
        ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 6-5"/></svg>
        : n
      }
    </div>
  );
}

export default function RaiseTicket() {
  const { currentUser, submitTicket } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [division, setDivision]     = useState(currentUser?.division || '');
  const [category, setCategory] = useState('');
  const [subject, setSubject]   = useState('');
  const [desc, setDesc]         = useState('');
  const [priority, setPriority] = useState('');
  const [device, setDevice]     = useState('');

  // Step 2 state
  const [remote, setRemote]   = useState('In Person');
  const [preferredTime, setPreferredTime] = useState('');
  const [fileName, setFileName] = useState('');

  const goStep = (n) => {
    if (n === 2 && step === 1) {
      if (!subject.trim() || !desc.trim()) { showToast('Please fill in Issue and Issue Detail', 'error'); return; }
    }
    setStep(n);
    window.scrollTo(0,0);
  };

  const handleSubmit = () => {
    const id = submitTicket({ division, category, subject, desc, priority: priority||'Medium', device, remote, preferredTime }, currentUser);
    showToast(`Ticket #${id} submitted!`, 'success');
    navigate('/dashboard');
  };


  const stepLabels = ['Issue Details','Remote & Files','Review'];

  return (
    <div className="page-fade">
      <div className="breadcrumb">
        <a onClick={()=>navigate('/dashboard')}>Dashboard</a>
        <span className="breadcrumb-sep">›</span>
        <span>Raise Ticket</span>
      </div>
      <div className="page-header" style={{marginBottom:20}}>
        <div>
          <div className="page-title">Raise a Support Ticket</div>
          <div className="page-sub">Fill in the details below to get help from IT admin</div>
        </div>
      </div>

      {/* Stepper */}
      <div style={{marginBottom:28}}>
        <div className="stepper">
          {[1,2,3].map((n,i)=>(
            <div key={n} className="step-item" style={i===2?{flex:'0 0 auto'}:{}}>
              <StepCircle n={n} step={step}/>
              {i<2 && <div className={`step-line ${n<step?'done':''}`}/>}
            </div>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
          {stepLabels.map((l,i)=>(
            <span key={l} style={{fontSize:12,fontWeight:600,color:i+1===step?'var(--blue-light)':'var(--text-muted)'}}>{l}</span>
          ))}
        </div>
      </div>

      {/* Step 1 */}
      {step===1 && (
        <>
          <div className="form-section">
            <div className="form-section-title">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}><rect x="2" y="2" width="12" height="12" rx="2"/><line x1="5" y1="6" x2="11" y2="6"/><line x1="5" y1="10" x2="8" y2="10"/></svg>
              Basic Information
            </div>
            <div className="form-grid-2">
              <div className="form-group-light"><label className="form-label-light">Division</label>
                <CustomSelect value={division} onChange={setDivision} options={DIVISIONS} placeholder="Select division" className="form-select-light" />
              </div>
              <div className="form-group-light"><label className="form-label-light">Issue Category</label>
                <CustomSelect value={category} onChange={setCategory} options={CATS} placeholder="Select category" className="form-select-light" />
              </div>
            </div>
            <div className="form-group-light">
              <label className="form-label-light">Issue <span style={{color:'var(--danger)'}}>*</span></label>
              <input className="form-input-light" placeholder="Brief description of your issue" maxLength={100} value={subject} onChange={e=>setSubject(e.target.value)}/>
            </div>
            <div className="form-group-light">
              <label className="form-label-light">Issue Detail <span style={{color:'var(--danger)'}}>*</span></label>
              <textarea className="form-textarea-light" maxLength={600} rows={4}
                placeholder="Describe the issue in detail…" value={desc} onChange={e=>setDesc(e.target.value)}/>
              <div className="char-count">{desc.length} / 600</div>
            </div>
            <div className="form-grid-2">
              <div className="form-group-light"><label className="form-label-light">Priority</label>
                <div className="priority-grid">
                  {['Low','Medium','High','Very High'].map(p=>(
                    <button key={p} className={`priority-btn${priority===p?` active-${p.toLowerCase().replace(' ','-')}`:''}`} onClick={()=>setPriority(p)}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="form-group-light"><label className="form-label-light">Device / Asset Tag</label>
                <input className="form-input-light" placeholder="e.g. PC-CHN-045" value={device} onChange={e=>setDevice(e.target.value)}/>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" style={{color:'var(--text-secondary)',borderColor:'var(--slate)'}} onClick={()=>navigate('/dashboard')}>Cancel</button>
            <button className="btn btn-primary" onClick={()=>goStep(2)}>Next: Remote & Files →</button>
          </div>
        </>
      )}

      {/* Step 2 */}
      {step===2 && (
        <>
          <div className="form-section">
            <div className="form-section-title">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}><rect x="1" y="4" width="14" height="9" rx="2"/><line x1="5" y1="13" x2="5" y2="15" strokeLinecap="round"/><line x1="11" y1="13" x2="11" y2="15" strokeLinecap="round"/><line x1="3" y1="15" x2="13" y2="15" strokeLinecap="round"/></svg>
              Remote Access Preference
            </div>
            <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:16}}>Allow the admin to connect remotely and fix your issue faster.</p>
            <div className="remote-grid">
              {REMOTES.map(r=>(
                <div key={r.key} className={`remote-btn${remote===r.key?' active':''}`} onClick={()=>setRemote(r.key)}>
                  <div className="remote-btn-icon">{r.icon}</div>
                  <div className="remote-btn-label">{r.label}</div>
                  <div className="remote-btn-sub">{r.sub}</div>
                </div>
              ))}
            </div>
            {!['In Person','Over Phone'].includes(remote) && (
              <div className="info-banner" style={{marginTop:12}}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={15} height={15}><circle cx="8" cy="8" r="6"/><line x1="8" y1="7" x2="8" y2="11" strokeLinecap="round"/><circle cx="8" cy="5.5" r="0.8" fill="currentColor"/></svg>
                Share your remote ID with the admin <strong>only when they contact you</strong>.
              </div>
            )}
            <div style={{marginTop:20}}>
              <div className="form-section-title" style={{marginBottom:12}}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="8" strokeLinecap="round"/><line x1="8" y1="8" x2="10.5" y2="9.5" strokeLinecap="round"/></svg>
                Preferred Time Slot
              </div>
              <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>When would you like the admin to reach you?</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {['9 AM – 10 AM','10 AM – 11 AM','11 AM – 12 PM','12 PM – 1 PM','1 PM – 2 PM','2 PM – 3 PM','3 PM – 4 PM','4 PM – 5 PM','Any Time'].map(slot=>(
                  <button key={slot} onClick={()=>setPreferredTime(slot)} style={{
                    padding:'10px 8px',borderRadius:'var(--radius-md)',fontSize:13,fontWeight:600,
                    border: preferredTime===slot ? '1.5px solid var(--blue-light)' : '1.5px solid var(--slate)',
                    background: preferredTime===slot ? 'var(--blue-pale)' : 'var(--white)',
                    color: preferredTime===slot ? 'var(--blue-light)' : 'var(--text-secondary)',
                    cursor:'pointer',transition:'all 0.15s',display:'flex',alignItems:'center',justifyContent:'center',gap:6
                  }}>
                    {slot==='Any Time' && <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" width={13} height={13}><circle cx="7" cy="7" r="5.5"/><line x1="7" y1="4" x2="7" y2="7" strokeLinecap="round"/><line x1="7" y1="7" x2="9" y2="8.5" strokeLinecap="round"/></svg>}
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-title">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width={16} height={16}><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 7l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Attachment (Optional)
            </div>
            <label className="drop-zone" style={{display:'block'}}>
              <input type="file" style={{display:'none'}} onChange={e=>setFileName(e.target.files?.[0]?.name||'')}/>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><rect x="4" y="4" width="20" height="20" rx="4"/><line x1="14" y1="10" x2="14" y2="18" strokeLinecap="round"/><line x1="10" y1="14" x2="18" y2="14" strokeLinecap="round"/></svg>
              <p>Drag & drop or <span style={{color:'var(--blue)',fontWeight:500}}>browse</span> to upload</p>
              <p style={{fontSize:12,marginTop:2}}>PNG, JPG, PDF — max 5MB</p>
            </label>
            {fileName && <div style={{marginTop:10,fontSize:14}}><span style={{background:'var(--blue-pale)',color:'var(--blue)',padding:'4px 10px',borderRadius:4}}>📎 {fileName}</span></div>}
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" style={{color:'var(--text-secondary)',borderColor:'var(--slate)'}} onClick={()=>goStep(1)}>← Back</button>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-outline" style={{color:'var(--text-secondary)',borderColor:'var(--slate)'}} onClick={()=>showToast('Draft saved','success')}>Save Draft</button>
              <button className="btn btn-primary" onClick={()=>goStep(3)}>Next: Review →</button>
            </div>
          </div>
        </>
      )}

      {/* Step 3: Review */}
      {step===3 && (
        <>
          <div className="form-section">
            <div className="form-section-title">Review Your Ticket</div>
            <div style={{fontSize:16,fontWeight:600,color:'var(--navy)',marginBottom:14}}>{subject}</div>
            <div style={{background:'var(--off-white)',borderRadius:'var(--radius-md)',padding:14,fontSize:15,color:'var(--text-primary)',lineHeight:1.7,marginBottom:16}}>{desc}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[['Division',division||'Not selected'],['Issue Category',category||'Not selected'],['Priority',priority||'Medium'],['Device',device||'—'],['Remote',remote],['Preferred Time',preferredTime||'Not set'],['Attachment',fileName||'None']].map(([k,v])=>(
                <div key={k} style={{padding:'9px 12px',background:'var(--off-white)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:2}}>{k}</div>
                  <div style={{fontSize:14,color:'var(--text-primary)',fontWeight:500}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" style={{color:'var(--text-secondary)',borderColor:'var(--slate)'}} onClick={()=>goStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={handleSubmit}>Submit Ticket</button>
          </div>
        </>
      )}
    </div>
  );
}
