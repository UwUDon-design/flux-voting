import { useEffect, useState } from 'react';
import { getAdminResults, exportResultsCsv, getAdminElection, advanceElection } from '../../api';

export default function AdminResults() {
  const [results, setResults] = useState(null);
  const [election, setElection] = useState(null);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    try {
      const [el, r] = await Promise.all([getAdminElection(), getAdminResults()]);
      setElection(el);
      setResults(r);
    } catch (err) {
      setError(err.response?.data?.error || 'Results not available yet. Close voting first.');
    }
  };

  useEffect(() => { load().catch(() => {}); }, []);

  const handlePublish = async () => {
    if (!window.confirm('Publish results? All members will be able to see the outcome on the public results page.')) return;
    setPublishing(true);
    try {
      await advanceElection('publish_results');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to publish results');
    } finally {
      setPublishing(false);
    }
  };

  const phase = election?.phase;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-4xl font-bold text-warm-white uppercase tracking-wider">Results</h1>
          <p className="font-mono text-xs text-stone mt-1">
            {phase === 'PUBLISHED' ? 'Published — visible to all members' : 'Admin view only'}
          </p>
        </div>
        {results && (
          <button onClick={exportResultsCsv} className="btn-ghost text-sm px-4 py-2">Export CSV</button>
        )}
      </div>

      {error && (
        <div className="card border-l-4 border-stone">
          <p className="text-stone">{error}</p>
        </div>
      )}

      {phase === 'RESULTS' && (
        <div className="card border-l-4 border-ember flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-heading text-lg font-bold text-warm-white uppercase">Ready to Publish?</p>
            <p className="font-mono text-xs text-stone mt-1">Once published, all members can see the results.</p>
          </div>
          <button onClick={handlePublish} disabled={publishing} className="btn-primary flex-shrink-0">
            {publishing ? 'Publishing…' : 'Publish Results'}
          </button>
        </div>
      )}

      {phase === 'PUBLISHED' && (
        <div className="card border-l-4 border-wheat">
          <p className="font-mono text-xs text-wheat uppercase tracking-widest">Results are published and visible to all members.</p>
        </div>
      )}

      {results ? (
        <div className="space-y-8">
          {results.map(pos => (
            <div key={pos.positionId} className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-2xl font-bold text-warm-white uppercase">{pos.positionTitle}</h2>
                <span className="font-mono text-xs text-stone">{pos.totalVotes} total votes</span>
              </div>

              {pos.isTie && (
                <div className="bg-wheat/10 border border-wheat/40 px-4 py-2 mb-4">
                  <p className="font-mono text-xs text-wheat uppercase tracking-widest">
                    TIE between {pos.tiedCandidates.map(c => c.name).join(' and ')} — manual resolution required
                  </p>
                </div>
              )}

              {pos.candidates.length === 0 ? (
                <p className="font-mono text-xs text-stone/50">No candidates were registered.</p>
              ) : (
                <div className="space-y-3">
                  {pos.candidates.map(c => {
                    const isWinner = pos.winner?.id === c.id;
                    const isTied = pos.isTie && pos.tiedCandidates.some(t => t.id === c.id);
                    return (
                      <div
                        key={c.id}
                        className={`p-4 ${
                          isWinner ? 'bg-ember/10 border border-ember/50' :
                          isTied   ? 'bg-wheat/10 border border-wheat/40' :
                                     'bg-carbon border border-stone/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-heading text-xl font-bold text-warm-white">{c.name}</span>
                            {isWinner && <span className="tag bg-ember text-white text-xs">Winner</span>}
                            {isTied && <span className="tag bg-wheat/30 text-wheat border border-wheat/40 text-xs">Tie</span>}
                          </div>
                          <span className="font-mono text-sm text-stone">
                            {c.votes} votes ({c.percentage}%)
                          </span>
                        </div>
                        <div className="bg-stone/20 h-2">
                          <div
                            className={`h-2 ${isWinner ? 'bg-ember' : isTied ? 'bg-wheat' : 'bg-stone/50'}`}
                            style={{ width: `${c.percentage}%` }}
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
      ) : !error ? (
        <p className="font-mono text-stone text-sm animate-pulse">Loading results…</p>
      ) : null}
    </div>
  );
}
