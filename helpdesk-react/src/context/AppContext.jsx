import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);
const API = 'http://localhost:5000/api';

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('nxt_session');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [rawTickets, setRawTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API}/tickets`);
      const data = await res.json();
      setRawTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('nxt_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('nxt_session');
    }
  }, [currentUser]);

  const login = (user) => setCurrentUser(user);
  const logout = () => setCurrentUser(null);

  const submitTicket = async (ticketData, user) => {
    try {
      const res = await fetch(`${API}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticketData.subject,
          category: ticketData.category,
          division: ticketData.division || user.division,
          dept: user.dept || '',
          employee_id: user.id,
          employee_name: user.name,
          priority: ticketData.priority,
          remote: ticketData.remote,
          device: ticketData.device,
          description: ticketData.desc
        })
      });
      const newTicket = await res.json();
      await fetchTickets();
      return newTicket.id;
    } catch (err) {
      console.error(err);
    }
  };

  const addMessage = async (ticketId, message) => {
    try {
      await fetch(`${API}/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_role: message.from,
          sender_name: message.name,
          message: message.text
        })
      });
      await fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  const setStatus = async (ticketId, status) => {
    try {
      await fetch(`${API}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      await fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  const updatePriority = async (ticketId, priority) => {
    try {
      await fetch(`${API}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      });
      await fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  const assignTicket = async (ticketId, assignedTo) => {
    try {
      await fetch(`${API}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: assignedTo })
      });
      await fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  const setResolution = async (ticketId, note) => {
    try {
      await fetch(`${API}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved', resolution_note: note })
      });
      await fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  const tickets = rawTickets.map(t => ({
    id: t.id,
    subject: t.subject,
    category: t.category,
    division: t.division,
    dept: t.dept,
    employeeId: t.employee_id,
    employeeName: t.employee_name,
    priority: t.priority,
    status: t.status,
    remote: t.remote,
    device: t.device,
    desc: t.description,
    createdAt: t.created_at ? new Date(t.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
    updatedAt: t.updated_at ? new Date(t.updated_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
    resolvedAt: t.resolved_at ? new Date(t.resolved_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
    inProgressAt: t.in_progress_at ? new Date(t.in_progress_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
    assignedTo: t.assigned_to,
    resolutionNote: t.resolution_note,
    messages: (t.messages || []).map(m => ({
      from: m.sender_role,
      name: m.sender_name,
      text: m.message,
      time: m.sent_at ? new Date(m.sent_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
    })),
    history: (t.history || []).map(h => ({
      label: h.action_label,
      time: h.action_time ? new Date(h.action_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
    }))
  }));

  const getMyTickets = () => {
    if (!currentUser) return [];
    return tickets.filter(t => t.employeeId === currentUser.id);
  };

  return (
    <AppContext.Provider value={{
      currentUser, tickets, loading,
      login, logout, submitTicket,
      addMessage, setStatus, assignTicket, setResolution,
      getMyTickets, updatePriority, refreshTickets: fetchTickets
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
