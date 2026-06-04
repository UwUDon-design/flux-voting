import { createContext, useContext, useState, useEffect } from 'react';
import { getAdminMe, adminLogout } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminMe()
      .then(data => setAdmin(data))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await adminLogout();
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, setAdmin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
