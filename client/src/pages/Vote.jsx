import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { validateMember, getCandidates, castVotes, getElectionState } from '../api';

export default function Vote() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(null);
  const [step, setStep] = useState('id');
  const [memberId, setMemberId] = useState('');
  const [member, setMember] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getElectionState().then(d => setPhase(d.phase)).catch(() => {});
  }, []);

  const handleValidate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await validateMember(memberId.trim());
      const candidates = await getCandidates(data.memberId);
      setMember(data);
      setPositions(candidates);
      setStep('vote');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to validate ID');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (positionId, candidateId) => {
    setSelections(s => ({ ...s, [positionId]: candidateId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const unvotedOpenPositions = positions.filter(
      p => !member.votedPositions.includes(p.id) && p.candidates.length > 0 && !selections[p.id]
    );
    if (unvotedOpenPositions.length > 0) {
      setError('Please select a candidate for each available position, or skip positions with no candidates.');
      return;
    }

    const votes = Object.entries(selections).map(([positionId, candidateId]) => ({ positionId, candidateId }));
    if (votes.length === 0) {
      setError('No new votes to submit.');
      return;
    }

    setLoading(true);
    try {
      await castVotes(member.memberId, votes);
      navigate('/vote/confirmed');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cast votes');
    } finally {
      setLoading(false);
    }
  };

  if (phase && phase !== 'VOTING') {
    return (
      <Layout>
        <div className="card border-l-4 border-stone">
          <h2 className="font-heading text-2xl font-bold text-warm-white uppercase mb-2">Voting Closed</h2>
          <p className="text-stone">Voting is not currently open. Check back when the election is live.</p>
        </div>
      </Layout>
    );
  }

  const unvotedPositions = positions.filter(p => !member?.votedPositions?.includes(p.id));
  const votedPositions = positions.filter(p => member?.votedPositions?.includes(p.id));

  return (
    <Layout>
      <h1 className="font-heading text-5xl font-bold text-warm-white uppercase tracking-widest mb-2">
        Voter <span className="text-ember">Portal</span>
      </h1>
      <p className="text-stone font-mono text-sm mb-10">Cast your votes for EXCO 2026</p>

      {step === 'id' && (
        <form onSubmit={handleValidate} className="space-y-4">
          <div>
            <label className="font-mono text-xs text-stone uppercase tracking-widest block mb-2">Member ID</label>
            <input
              className="input font-mono text-xl tracking-widest uppercase"
              placeholder="FLUX-XXXX"
              value={memberId}
              onChange={e => setMemberId(e.target.value.toUpperCase())}
              required
            />
          </div>
          {error && <p className="text-red-400 font-mono text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Checking…' : 'Continue to Vote'}
          </button>
        </form>
      )}

      {step === 'vote' && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="card border-l-4 border-ember flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-stone uppercase tracking-widest">Voting as</p>
              <p className="font-mono text-ember text-lg">{member.memberId}</p>
            </div>
            {votedPositions.length > 0 && (
              <span className="font-mono text-xs text-wheat">
                {votedPositions.length}/{positions.length} positions voted
              </span>
            )}
          </div>

          {unvotedPositions.length === 0 ? (
            <div className="card border-l-4 border-wheat">
              <h2 className="font-heading text-2xl font-bold text-wheat uppercase mb-2">All Votes Cast</h2>
              <p className="text-stone">You have voted for all positions. Thank you for participating!</p>
            </div>
          ) : (
            <>
              {unvotedPositions.map(pos => (
                <div key={pos.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-heading text-2xl font-bold text-warm-white uppercase">{pos.title}</h2>
                    {selections[pos.id] && (
                      <span className="tag bg-ember/20 text-ember border border-ember/40">Selected</span>
                    )}
                  </div>

                  {pos.candidates.length === 0 ? (
                    <p className="font-mono text-xs text-stone">No candidates registered for this position.</p>
                  ) : (
                    <div className="space-y-2">
                      {pos.candidates.map(c => (
                        <label
                          key={c.id}
                          className={`block card cursor-pointer transition-all ${
                            selections[pos.id] === c.id
                              ? 'border-ember bg-ember/10'
                              : 'border-stone/30 hover:border-stone/60'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <input
                              type="radio"
                              name={pos.id}
                              value={c.id}
                              checked={selections[pos.id] === c.id}
                              onChange={() => handleSelect(pos.id, c.id)}
                              className="mt-1 accent-ember flex-shrink-0"
                            />
                            <div>
                              <p className="font-heading text-lg font-bold text-warm-white">{c.name}</p>
                              {c.bio && <p className="text-stone text-sm mt-1 leading-relaxed">{c.bio}</p>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {votedPositions.length > 0 && (
                <div className="card">
                  <p className="font-mono text-xs text-stone uppercase tracking-widest mb-3">Already voted</p>
                  <div className="space-y-1">
                    {votedPositions.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="text-wheat text-sm">✓</span>
                        <span className="font-mono text-xs text-stone">{p.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-red-400 font-mono text-sm">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Submitting…' : 'Submit Votes'}
              </button>
              <p className="font-mono text-xs text-stone text-center">Votes are final once submitted.</p>
            </>
          )}
        </form>
      )}
    </Layout>
  );
}
