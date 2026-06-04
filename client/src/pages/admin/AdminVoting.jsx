import { useEffect, useState, useCallback } from 'react';
import { getAdminElection, getLiveTally, getParticipation } from '../../api';

export default function AdminVoting() {
  const [election, setElection] = useState(null);
  const [tally, setTally] = useState(null);
  const [participation, setParticipation] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadTally = useCallback(async () => {
    try {
      const [el, t, p] = await Promise.all([
        getAdminElection(),
        getLiveTally(),
        getParticipation(),
      ]);
      setElection(el);
      setTally(t);
      setParticipation(p);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      // silent — auto-refresh will retry
    }
  }, []);

  useEffect(() => {
    loadTally();
    const interval = setInterval(loadTally, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [loadTally]);

  const phase = election?.phase;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-4xl font-bold text-warm-white uppercase tracking-wider">Voting</h1>
          <p className="font-mono text-xs text-stone mt-1">
            Live tally · {lastUpdated ? `Updated ${lastUpdated}` : 'Loading…'}
          </p>
        </div>
        <button onClick={loadTally} className="btn-ghost text-sm px-4 py-2">Refresh</button>
      </div>

      {phase && phase !== 'VOTING' && phase !== 'RESULTS' && phase !== 'PUBLISHED' && (
        <div className="card border-l-4 border-stone">
          <p className="font-heading text-xl font-bold text-stone uppercase mb-1">Voting Not Active</p>
          <p className="text-stone text-sm">Current phase: <span className="text-warm-white">{phase}</span>. Open voting from the Dashboard.</p>
        </div>
      )}

      {participation && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Members', value: participation.total },
            { label: 'Voted',         value: participation.voted },
            { label: 'Unused IDs',    value: participation.unused },
            { label: 'Turnout',       value: participation.total > 0 ? `${Math.round((participation.voted / participation.total) * 100)}%` : '—' },
          ].map(stat => (
            <div key={stat.label} className="card text-center">
              <p className="font-heading text-3xl font-bold text-ember">{stat.value}</p>
              <p className="font-mono text-xs text-stone uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {tally ? (
        <div className="space-y-6">
          {tally.map(pos => (
            <div key={pos.positionId} className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-xl font-bold text-warm-white uppercase">{pos.positionTitle}</h2>
                <span className="font-mono text-xs text-stone">{pos.totalVotes} votes</span>
              </div>

              {pos.candidates.length === 0 ? (
                <p className="font-mono text-xs text-stone/50">No candidates.</p>
              ) : (
                <div className="space-y-2">
                  {pos.candidates.map((c, i) => {
                    const pct = pos.totalVotes > 0 ? Math.round((c.votes / pos.totalVotes) * 100) : 0;
                    return (
                      <div key={c.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-sm font-bold text-warm-white flex items-center gap-2">
                            {i === 0 && c.votes > 0 && <span className="text-ember text-xs">▲</span>}
                            {c.name}
                          </span>
                          <span className="font-mono text-xs text-stone">{c.votes} ({pct}%)</span>
                        </div>
                        <div className="bg-stone/20 h-2 w-full">
                          <div
                            className="h-2 bg-ember transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="font-mono text-stone text-sm animate-pulse">Loading tally…</p>
      )}

      <p className="font-mono text-xs text-stone/40 text-center">
        Auto-refreshes every 10 seconds · Visible to admins only
      </p>
    </div>
  );
}
