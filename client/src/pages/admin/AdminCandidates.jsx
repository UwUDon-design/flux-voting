import { useEffect, useState } from 'react';
import { getAdminCandidates, removeCandidate, closePositionRegistration } from '../../api';

export default function AdminCandidates() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await getAdminCandidates();
      setPositions(data);
    } catch {
      setError('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (candidateId, name, positionTitle) => {
    if (!window.confirm(`Remove ${name} from ${positionTitle}? This cannot be undone.`)) return;
    try {
      await removeCandidate(candidateId);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove candidate');
    }
  };

  const handleCloseRegistration = async (positionId, title) => {
    if (!window.confirm(`Close registration for ${title}? No new candidates will be able to register.`)) return;
    try {
      await closePositionRegistration(positionId);
      setPositions(p => p.map(pos => pos.id === positionId ? { ...pos, registrationClosed: true } : pos));
    } catch {
      alert('Failed to close registration');
    }
  };

  const totalCandidates = positions.reduce((sum, p) => sum + p.candidates.length, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-4xl font-bold text-warm-white uppercase tracking-wider">Candidates</h1>
        <p className="font-mono text-xs text-stone mt-1">{totalCandidates} total registrations across {positions.length} positions</p>
      </div>

      {error && <p className="text-red-400 font-mono text-sm">{error}</p>}

      {loading ? (
        <p className="font-mono text-stone text-sm animate-pulse">Loading…</p>
      ) : (
        <div className="space-y-6">
          {positions.map(pos => (
            <div key={pos.id} className="card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-warm-white uppercase">{pos.title}</h2>
                  <p className="font-mono text-xs text-stone mt-1">
                    {pos.candidates.length}/3 candidates ·{' '}
                    {pos.registrationClosed
                      ? <span className="text-red-400">Registration closed</span>
                      : <span className="text-wheat">Registration open</span>
                    }
                  </p>
                </div>
                {!pos.registrationClosed && (
                  <button
                    onClick={() => handleCloseRegistration(pos.id, pos.title)}
                    className="btn-ghost text-xs px-3 py-2 flex-shrink-0"
                  >
                    Close Registration
                  </button>
                )}
              </div>

              {pos.candidates.length === 0 ? (
                <p className="font-mono text-xs text-stone/50">No candidates registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {pos.candidates.map(c => (
                    <div key={c.id} className="flex items-start justify-between gap-4 py-3 border-b border-stone/10 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-lg font-bold text-warm-white">{c.name}</p>
                        <p className="font-mono text-xs text-stone">{c.memberId}</p>
                        {c.bio && <p className="text-stone/70 text-sm mt-1 leading-relaxed">{c.bio}</p>}
                      </div>
                      <button
                        onClick={() => handleRemove(c.id, c.name, pos.title)}
                        className="btn-danger flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
