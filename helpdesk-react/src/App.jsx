import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { EmployeeShell } from './components/EmployeeShell';
import { AdminShell } from './components/AdminShell';

import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import RaiseTicket from './pages/RaiseTicket';
import EmployeeTicketDetail from './pages/EmployeeTicketDetail';
import TicketHistory from './pages/TicketHistory';
import MyAssets from './pages/MyAssets';
import Notifications from './pages/Notifications';
import AdminDashboard from './pages/AdminDashboard';
import AdminTickets from './pages/AdminTickets';
import AdminTicketDetail from './pages/AdminTicketDetail';
import AdminReports from './pages/AdminReports';
import AdminHistory from './pages/AdminHistory';
import AssetMaster from './pages/AssetMaster';
import AdminEmployees from './pages/AdminEmployees';
import AdminAssignDevice from './pages/AdminAssignDevice';
import AdminSettings from './pages/AdminSettings';
import AdminProfile from './pages/AdminProfile';
import EmployeeProfile from './pages/EmployeeProfile';

/* Path prefixes that use the EMPLOYEE sidebar+header shell */
const EMPLOYEE_SHELL_PREFIXES = [
  '/dashboard',
  '/history',
  '/tickets',
  '/raise-ticket',
  '/assets',
  '/notifications',
  '/profile',
];

function pathUsesEmployeeShell(pathname) {
  return EMPLOYEE_SHELL_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function pathUsesAdminShell(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function AppRoutes() {
  const { currentUser } = useApp();
  const location = useLocation();
  const defaultPath = currentUser?.role === 'admin' ? '/admin' : '/dashboard';

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  /* ── Employee shell layout ── */
  if (pathUsesEmployeeShell(location.pathname)) {
    return (
      <EmployeeShell>
        <Routes>
          <Route path="/dashboard"     element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/history"       element={<ProtectedRoute><TicketHistory /></ProtectedRoute>} />
          <Route path="/raise-ticket"  element={<ProtectedRoute><RaiseTicket /></ProtectedRoute>} />
          <Route path="/tickets/:id"   element={<ProtectedRoute><EmployeeTicketDetail /></ProtectedRoute>} />
          <Route path="/assets"        element={<ProtectedRoute><MyAssets /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/profile"       element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
        </Routes>
      </EmployeeShell>
    );
  }

  /* ── Admin shell layout ── */
  if (pathUsesAdminShell(location.pathname)) {
    return (
      <AdminShell>
        <Routes>
          <Route path="/admin"                   element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/tickets"           element={<ProtectedRoute adminOnly><AdminTickets /></ProtectedRoute>} />
          <Route path="/admin/tickets/:id"       element={<ProtectedRoute adminOnly><AdminTicketDetail /></ProtectedRoute>} />
          <Route path="/admin/employees"         element={<ProtectedRoute adminOnly><AdminEmployees /></ProtectedRoute>} />
          <Route path="/admin/assets"            element={<ProtectedRoute adminOnly><AssetMaster /></ProtectedRoute>} />
          <Route path="/admin/assign-device"     element={<ProtectedRoute adminOnly><AdminAssignDevice /></ProtectedRoute>} />
          <Route path="/admin/reports"           element={<ProtectedRoute adminOnly><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/history"           element={<ProtectedRoute adminOnly><AdminHistory /></ProtectedRoute>} />
          <Route path="/admin/notifications"     element={<ProtectedRoute adminOnly><Notifications /></ProtectedRoute>} />
          <Route path="/admin/settings"          element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/profile"           element={<ProtectedRoute adminOnly><AdminProfile /></ProtectedRoute>} />
        </Routes>
      </AdminShell>
    );
  }

  /* ── Legacy layout for anything else ── */
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 64, minHeight: '100vh', background: 'var(--off-white)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 40px' }}>
          <Routes>
            <Route path="/" element={<Navigate to={defaultPath} replace />} />
            <Route path="/login" element={<Navigate to={defaultPath} replace />} />
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
