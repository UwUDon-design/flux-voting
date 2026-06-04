import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedAdminRoute({ children }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center">
        <span className="font-mono text-stone text-sm animate-pulse">Loading…</span>
      </div>
    );
  }

  if (!admin) return <Navigate to="/admin/login" replace />;

  return children;
}
