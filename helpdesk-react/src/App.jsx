import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import RaiseTicket from './pages/RaiseTicket';
import EmployeeTicketDetail from './pages/EmployeeTicketDetail';
import TicketHistory from './pages/TicketHistory';
import AdminDashboard from './pages/AdminDashboard';
import AdminTicketDetail from './pages/AdminTicketDetail';
import AdminReports from './pages/AdminReports';
import AdminHistory from './pages/AdminHistory';
import AssetMaster from './pages/AssetMaster';

function AppRoutes() {
  const { currentUser } = useApp();
  const defaultPath = currentUser?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <>
      {currentUser && <Navbar />}
      <div style={currentUser
        ? { paddingTop: 64, minHeight: '100vh', background: 'var(--off-white)' }
        : {}
      }>
        {currentUser && (
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 40px' }}>
            <Routes>
              <Route path="/" element={<Navigate to={defaultPath} replace />} />
              <Route path="/login" element={<Navigate to={defaultPath} replace />} />

              {/* Employee */}
              <Route path="/dashboard" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
              <Route path="/raise-ticket" element={<ProtectedRoute><RaiseTicket /></ProtectedRoute>} />
              <Route path="/tickets/:id" element={<ProtectedRoute><EmployeeTicketDetail /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><TicketHistory /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/tickets/:id" element={<ProtectedRoute adminOnly><AdminTicketDetail /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute adminOnly><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/history" element={<ProtectedRoute adminOnly><AdminHistory /></ProtectedRoute>} />
              <Route path="/admin/assets" element={<ProtectedRoute adminOnly><AssetMaster /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to={defaultPath} replace />} />
            </Routes>
          </div>
        )}

        {!currentUser && (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
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
