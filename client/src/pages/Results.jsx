import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getPublishedResults } from '../api';

export default function Results() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublishedResults()
      .then(setResults)
      .catch(err => setError(err.response?.data?.error || 'Results not available'));
  }, []);

  if (error) {
    return (
      <Layout>
        <div className="card border-l-4 border-stone">
          <h2 className="font-heading text-2xl font-bold text-warm-white uppercase mb-2">Not Yet Available</h2>
          <p className="text-stone">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="font-heading text-5xl font-bold text-warm-white uppercase tracking-widest mb-2">
        Election <span className="text-ember">Results</span>
      </h1>
      <p className="text-stone font-mono text-sm mb-10">EXCO 2026 · The Flux · NIBM SOCE</p>

      {!results ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse h-32 bg-graphite" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {results.map(pos => (
            <div key={pos.positionId} className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-2xl font-bold text-warm-white uppercase">{pos.positionTitle}</h2>
                <span className="font-mono text-xs text-stone">{pos.totalVotes} votes cast</span>
              </div>

              {pos.isTie && (
                <div className="bg-wheat/10 border border-wheat/40 px-4 py-2 mb-4">
                  <p className="font-mono text-xs text-wheat uppercase tracking-widest">TIE — Manual resolution required</p>
                </div>
              )}

              <div className="space-y-3">
                {pos.candidates.map(c => {
                  const isWinner = pos.winner?.id === c.id;
                  const isTied = pos.isTie && pos.tiedCandidates.some(t => t.id === c.id);
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-4 p-3 ${
                        isWinner ? 'bg-ember/10 border border-ember/40' :
                        isTied   ? 'bg-wheat/10 border border-wheat/40' :
                                   'bg-carbon border border-stone/20'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-heading text-lg font-bold text-warm-white">{c.name}</span>
                          {isWinner && <span className="tag bg-ember text-white">Winner</span>}
                          {isTied && <span className="tag bg-wheat/30 text-wheat border border-wheat/40">Tie</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-stone/20 h-2">
                            <div
                              className={`h-2 transition-all ${isWinner ? 'bg-ember' : isTied ? 'bg-wheat' : 'bg-stone/60'}`}
                              style={{ width: `${c.percentage}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-stone w-16 text-right">
                            {c.votes} ({c.percentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
