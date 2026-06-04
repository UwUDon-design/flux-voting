import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const { setAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(form.username, form.password);
      setAdmin({ username: form.username });
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-carbon flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-bold text-warm-white uppercase tracking-widest">
            THE <span className="text-ember">FLUX</span>
          </h1>
          <p className="font-mono text-xs text-stone mt-1 uppercase tracking-widest">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="font-mono text-xs text-stone uppercase tracking-widest block mb-2">Username</label>
            <input
              className="input"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="font-mono text-xs text-stone uppercase tracking-widest block mb-2">Password</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-red-400 font-mono text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
