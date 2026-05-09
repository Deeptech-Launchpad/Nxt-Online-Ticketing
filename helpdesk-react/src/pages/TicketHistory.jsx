import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function TicketHistory() {
  const { getMyTickets } = useApp();
  const navigate = useNavigate();
  const mine = getMyTickets();

  const ICON_MAP = { Network:'wifi_off', Software:'terminal', Hardware:'devices', Email:'mail', Printer:'print' };
  const ICON_BG  = {
    Network:  {background:'#fdecea',color:'#CC3A3A'},
    Software: {background:'#bbd3fd',color:'#485f84'},
    Hardware: {background:'#f1f5f9',color:'#475569'},
  };

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

  const priorityPill = (p) => {
    const styles = {
      'Very High': {background:'#fee2e2',color:'#b91c1c'},
      High:   {background:'#ffedd5',color:'#c2410c'},
      Medium: {background:'#dbeafe',color:'#1d4ed8'},
      Low:    {background:'#f1f5f9',color:'#475569'},
    };
    return (
      <span style={{...styles[p]||styles.Low,padding:'3px 12px',borderRadius:99,fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.05em'}}>
        {p}
      </span>
    );
  };

  const statusDisplay = (s) => {
    if(s==='open')        return {label:'Open',        color:'#dc2626'};
    if(s==='in-progress') return {label:'In Progress', color:'#2563eb'};
    return                       {label:'Resolved',    color:'#95BF47'};
  };

  return (
    <div className="page-fade">
      <div style={{marginBottom:32}}>
        <h2 style={{fontSize:30,fontWeight:900,fontFamily:'Manrope,sans-serif',letterSpacing:'-0.5px',color:'var(--navy)'}}>My Ticket History</h2>
        <p style={{color:'var(--text-muted)',marginTop:8,fontWeight:500}}>All tickets you have raised</p>
      </div>

      {mine.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" width={28} height={28}><rect x="4" y="4" width="20" height="20" rx="4"/></svg>
          </div>
          <div className="empty-title">No tickets yet</div>
          <div className="empty-sub">You haven't raised any tickets.</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {mine.map(t => {
            const icon = ICON_MAP[t.category] || 'confirmation_number';
            const iconBg = ICON_BG[t.category] || {background:'#f1f5f9',color:'#64748b'};
            const st = statusDisplay(t.status);
            return (
              <div key={t.id} onClick={()=>navigate(`/tickets/${t.id}`)} style={{
                cursor:'pointer',display:'flex',flexWrap:'wrap',alignItems:'center',gap:16,
                padding:20,borderRadius:20,background:'var(--white)',
                boxShadow:'var(--shadow-sm)',border:'1px solid transparent',
                transition:'all 0.15s'
              }}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--off-white)';e.currentTarget.style.borderColor='var(--slate)';e.currentTarget.style.boxShadow='var(--shadow-md)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='var(--white)';e.currentTarget.style.borderColor='transparent';e.currentTarget.style.boxShadow='var(--shadow-sm)';}}>
                <div style={{display:'flex',alignItems:'center',gap:14,minWidth:140}}>
                  <span style={{fontSize:11,fontFamily:'monospace',fontWeight:700,color:'#94a3b8'}}>#{t.id}</span>
                  <div style={{width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',...iconBg}}>
                    <span className="material-symbols-outlined" style={{fontSize:20}}>{icon}</span>
                  </div>
                </div>
                <div style={{flex:1,minWidth:200}}>
                  <h4 style={{fontWeight:700,color:'var(--navy)',fontSize:15,marginBottom:4}}>{t.subject}</h4>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{background:'var(--off-white)',color:'var(--text-muted)',padding:'1px 8px',borderRadius:4,fontSize:10,fontWeight:700,textTransform:'uppercase'}}>{t.category}</span>
                    <span style={{color:'var(--slate)'}}>•</span>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>{t.createdAt}</span>
                    {t.status === 'closed' && getResolutionTime(t) && (
                      <>
                        <span style={{color:'var(--slate)'}}>•</span>
                        <span style={{fontSize:11,color:'var(--success)',fontWeight:600}}>Resolved in {getResolutionTime(t)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:20,flexShrink:0}}>
                  {priorityPill(t.priority)}
                  <span style={{fontSize:13,fontWeight:700,color:st.color,display:'flex',alignItems:'center',gap:5}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:st.color,display:'inline-block'}}/>
                    {st.label}
                  </span>
                  <span className="material-symbols-outlined" style={{color:'var(--blue-light)',fontSize:20}}>arrow_forward</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
