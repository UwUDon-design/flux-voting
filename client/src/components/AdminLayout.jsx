import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/admin',            label: 'Dashboard',  exact: true },
  { to: '/admin/ids',        label: 'Member IDs' },
  { to: '/admin/candidates', label: 'Candidates' },
  { to: '/admin/voting',     label: 'Voting' },
  { to: '/admin/results',    label: 'Results' },
];

export default function AdminLayout({ children }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-carbon flex flex-col">
      <header className="border-b border-stone/30 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-heading font-bold text-2xl tracking-widest text-warm-white uppercase">
            THE <span className="text-ember">FLUX</span>
          </span>
          <span className="font-mono text-xs text-ember uppercase tracking-widest border border-ember px-2 py-0.5">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-stone hidden sm:block">{admin?.username}</span>
          <button onClick={handleLogout} className="btn-ghost text-sm px-4 py-2">Logout</button>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="w-48 border-r border-stone/30 flex-shrink-0 py-6 hidden md:block">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `block px-6 py-3 font-heading uppercase tracking-wider text-sm transition-colors ${
                  isActive
                    ? 'text-ember border-r-2 border-ember bg-graphite'
                    : 'text-stone hover:text-warm-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile nav */}
        <nav className="md:hidden w-full border-b border-stone/30 flex overflow-x-auto px-4 gap-2 py-2">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex-shrink-0 px-4 py-2 font-heading uppercase tracking-wider text-xs transition-colors ${
                  isActive ? 'text-ember border-b-2 border-ember' : 'text-stone'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
