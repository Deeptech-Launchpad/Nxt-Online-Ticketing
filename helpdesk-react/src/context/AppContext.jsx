import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);
// Relative paths — works in dev (Vite proxy) and production (Nginx proxy)
const API = '/api';
const FILE_BASE = '';

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

  /* ── TICKETS ─────────────────────────────────────────────── */

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
          description: ticketData.desc,
          preferred_time: ticketData.preferredTime || null,
          device_notes: ticketData.deviceNotes || null,
        })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to submit ticket:', data.error);
        return null;
      }

      // Upload attachment if provided
      if (data.id && ticketData.attachmentFile) {
        try {
          const form = new FormData();
          form.append('file', ticketData.attachmentFile);
          await fetch(`${API}/tickets/${data.id}/attachments`, { method: 'POST', body: form });
        } catch (uploadErr) {
          console.error('Attachment upload failed:', uploadErr);
        }
      }

      await fetchTickets();
      return data.id;
    } catch (err) {
      console.error(err);
      return null;
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

  /* ── ASSETS (Phase 2) ────────────────────────────────────── */

  const fetchMyAssets = async () => {
    if (!currentUser?.email) return [];
    try {
      const res = await fetch(`${API}/assets/me?email=${encodeURIComponent(currentUser.email)}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('fetchMyAssets failed:', err);
      return [];
    }
  };

  const fetchAllAllocations = async () => {
    try {
      const res = await fetch(`${API}/assets/all-allocations`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('fetchAllAllocations failed:', err);
      return [];
    }
  };

  const fetchAllAssets = async () => {
    try {
      const res = await fetch(`${API}/assets`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('fetchAllAssets failed:', err);
      return [];
    }
  };

  /* ── EMPLOYEES (Admin) ───────────────────────────────────── */

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API}/users`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('fetchEmployees failed:', err);
      return [];
    }
  };

  const addEmployee = async (payload) => {
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Failed to add employee' };
      return { ok: true, user: data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const triggerZohoSync = async () => {
    try {
      const res = await fetch(`${API}/zoho/sync`, { method: 'POST' });
      const data = await res.json();
      return data;   // { ok, total, inserted, updated, touched, skipped }
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const setUserStatus = async (userId, status) => {
    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Failed to update status' };
      return { ok: true, user: data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  /**
   * Update the currently logged-in user's profile.
   * Payload may include: name, phone, designation, dept, division.
   * Server-side: id, email, role, avatar (unless name changes) are protected.
   * On success the in-memory + localStorage currentUser is refreshed so the
   * new values appear everywhere immediately.
   */
  const updateProfile = async (payload) => {
    if (!currentUser?.id) return { ok: false, error: 'Not logged in' };
    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(currentUser.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Failed to update profile' };
      // Merge updates into local session — keep role + picture from existing session
      setCurrentUser(prev => ({ ...prev, ...data, role: prev.role, picture: prev.picture }));
      return { ok: true, user: data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  /* ── NOTIFICATIONS (Phase 2) ─────────────────────────────── */

  const fetchNotifications = async () => {
    if (!currentUser?.email) return [];
    try {
      const res = await fetch(`${API}/notifications/me?email=${encodeURIComponent(currentUser.email)}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('fetchNotifications failed:', err);
      return [];
    }
  };

  const markNotifRead = async (id) => {
    try {
      await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH' });
    } catch (err) { console.error(err); }
  };

  const markAllNotifRead = async () => {
    if (!currentUser?.email) return;
    try {
      await fetch(`${API}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email }),
      });
    } catch (err) { console.error(err); }
  };

  /* ── TICKET TRANSFORM ────────────────────────────────────── */

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
    preferredTime: t.preferred_time,
    deviceNotes: t.device_notes,
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
    })),
    attachments: (t.attachments || []).map(a => ({
      id: a.id,
      fileName: a.file_name,
      url: `${FILE_BASE}/uploads/${a.file_path}`,
      size: a.file_size,
      mimeType: a.mime_type,
      uploadedAt: a.uploaded_at,
    })),
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
      getMyTickets, updatePriority, refreshTickets: fetchTickets,
      fetchMyAssets, fetchAllAllocations, fetchAllAssets,
      fetchEmployees, addEmployee, setUserStatus, triggerZohoSync, updateProfile,
      fetchNotifications, markNotifRead, markAllNotifRead,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
