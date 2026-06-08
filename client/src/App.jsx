import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import AdminLayout from './components/AdminLayout';

import Landing from './pages/Landing';
import Register from './pages/Register';
import Vote from './pages/Vote';
import VoteConfirmed from './pages/VoteConfirmed';
import Results from './pages/Results';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminIDs from './pages/admin/AdminIDs';
import AdminCandidates from './pages/admin/AdminCandidates';
import AdminVoting from './pages/admin/AdminVoting';
import AdminResults from './pages/admin/AdminResults';

function AdminSection() {
  return (
    <ProtectedAdminRoute>
      <AdminLayout>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="ids" element={<AdminIDs />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="voting" element={<AdminVoting />} />
          <Route path="results" element={<AdminResults />} />
        </Routes>
      </AdminLayout>
    </ProtectedAdminRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#2E2E2E', color: '#F0EBE0', border: '1px solid #7A7060', fontFamily: 'DM Mono, monospace', fontSize: '13px' },
          success: { iconTheme: { primary: '#E05C00', secondary: '#F0EBE0' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#F0EBE0' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/vote" element={<Vote />} />
        <Route path="/vote/confirmed" element={<VoteConfirmed />} />
        <Route path="/results" element={<Results />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminSection />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
