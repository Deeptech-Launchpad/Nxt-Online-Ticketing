import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function AdminHistory() {
  const { tickets } = useApp();
  const navigate = useNavigate();

  // Aggregate all history events across all tickets
  const allEvents = tickets.flatMap(ticket => 
    (ticket.history || []).map(event => ({
      ...event,
      ticketId: ticket.id,
      ticketSubject: ticket.subject
    }))
  );

  // Sort events chronologically (assuming time parsing or just relying on mostly correct string dates for now, realistically this would be Date objects)
  // For simplicity with the mock data formatting, we reverse to show newest first roughly
  const sortedEvents = allEvents.reverse();

  return (
    <div className="page-fade">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <div className="page-title">Global History Log</div>
          <div className="page-sub">Audit trail of all ticket activities</div>
        </div>
        <button className="btn btn-outline" style={{ color: 'var(--text-secondary)', borderColor: 'var(--slate)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)' }}>download</span> Export CSV
        </button>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        {sortedEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--text-muted)' }}>history_toggle_off</span></div>
            <div className="empty-title">No history found</div>
            <div className="empty-sub">Activity log is currently empty.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sortedEvents.map((ev, index) => {
               // Determine icon based on action label
               const isSubmit = ev.label.toLowerCase().includes('submit');
               const isAssign = ev.label.toLowerCase().includes('assign');
               const isResolve = ev.label.toLowerCase().includes('resolv') || ev.label.toLowerCase().includes('clos');
               
               let icon = 'update';
               let iconColor = 'var(--text-muted)';
               let iconBg = 'var(--slate)';
               if (isSubmit) { icon = 'add_circle'; iconColor = 'var(--blue)'; iconBg = 'var(--blue-pale)'; }
               if (isAssign) { icon = 'person_add'; iconColor = '#f59e0b'; iconBg = 'rgba(245, 158, 11, 0.15)'; }
               if (isResolve) { icon = 'check_circle'; iconColor = 'var(--success)'; iconBg = 'var(--success-bg)'; }

               return (
                 <div key={index} style={{ display: 'flex', gap: 16 }}>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <div style={{ width: 36, height: 36, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                       <span className="material-symbols-outlined" style={{ fontSize: 18, color: iconColor }}>{icon}</span>
                     </div>
                     {index < sortedEvents.length - 1 && (
                       <div style={{ width: 2, background: 'var(--slate)', flex: 1, marginTop: 4, marginBottom: 4 }} />
                     )}
                   </div>
                   <div style={{ paddingBottom: 16, flex: 1 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                       <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)' }}>
                         {ev.label} 
                         <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>on ticket</span>
                         <span 
                           style={{ fontWeight: 600, color: 'var(--blue-light)', marginLeft: 6, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}
                           onClick={() => navigate(`/admin/tickets/${ev.ticketId}`)}
                         >
                           #{ev.ticketId}
                         </span>
                       </div>
                       <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                         {ev.time}
                       </div>
                     </div>
                     <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                       {ev.ticketSubject}
                     </div>
                   </div>
                 </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
