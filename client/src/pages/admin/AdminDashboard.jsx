import { useEffect, useState } from 'react';
import { confirm } from '../../utils/confirm';
import { getAdminElection, getParticipation, advanceElection } from '../../api';

const PHASES = ['SETUP', 'REGISTRATION', 'VOTING', 'RESULTS', 'PUBLISHED'];

const PHASE_ACTIONS = {
  SETUP:        { action: 'open_registration',  label: 'Open Registration',  confirm: 'Open candidate registration? Members will be able to sign up to run.' },
  REGISTRATION: { action: 'close_registration', label: 'Close Registration & Open Voting', confirm: 'Close registration and open voting? All positions will be locked for new candidates.' },
  VOTING:       { action: 'close_voting',        label: 'Close Voting',        confirm: 'Close voting? This will end the election and move to results.' },
  RESULTS:      { action: 'publish_results',     label: 'Publish Results',     confirm: 'Publish results? All members will be able to see the outcome.' },
};

export default function AdminDashboard() {
  const [election, setElection] = useState(null);
  const [participation, setParticipation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [el, part] = await Promise.all([getAdminElection(), getParticipation()]);
    setElection(el);
    setParticipation(part);
  };

  useEffect(() => { load().catch(() => {}); }, []);

  const handleAdvance = async () => {
    if (!election) return;
    const nextAction = PHASE_ACTIONS[election.phase];
    if (!nextAction) return;
    if (!await confirm(nextAction.confirm)) return;
    setError('');
    setLoading(true);
    try {
      await advanceElection(nextAction.action);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to advance phase');
    } finally {
      setLoading(false);
    }
  };

  const phase = election?.phase || 'SETUP';
  const phaseIndex = PHASES.indexOf(phase);
  const nextAction = PHASE_ACTIONS[phase];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-4xl font-bold text-warm-white uppercase tracking-wider">Dashboard</h1>
        <p className="font-mono text-xs text-stone mt-1">Election control centre</p>
      </div>

      {/* Phase indicator */}
      <div className="card">
        <p className="font-mono text-xs text-stone uppercase tracking-widest mb-4">Election Phase</p>
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {PHASES.map((p, i) => (
            <div key={p} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 ${
                i === phaseIndex ? 'bg-ember text-white' :
                i < phaseIndex  ? 'bg-stone/20 text-stone' :
                                  'bg-graphite text-stone/40 border border-stone/20'
              }`}>
                <span className="font-mono text-xs uppercase tracking-widest">{p}</span>
              </div>
              {i < PHASES.length - 1 && <span className="text-stone/30 text-xs">→</span>}
            </div>
          ))}
        </div>

        {nextAction && phase !== 'PUBLISHED' && (
          <div className="space-y-3">
            {error && <p className="text-red-400 font-mono text-sm">{error}</p>}
            <button onClick={handleAdvance} disabled={loading} className="btn-primary">
              {loading ? 'Processing…' : nextAction.label}
            </button>
          </div>
        )}

        {phase === 'PUBLISHED' && (
          <p className="font-mono text-xs text-wheat">Election is complete. Results are published.</p>
        )}
      </div>

      {/* Stats */}
      {participation && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total IDs',    value: participation.total },
            { label: 'Voted',        value: participation.voted },
            { label: 'Registered',   value: participation.registered },
            { label: 'Unused',       value: participation.unused },
          ].map(stat => (
            <div key={stat.label} className="card text-center">
              <p className="font-heading text-4xl font-bold text-ember">{stat.value}</p>
              <p className="font-mono text-xs text-stone uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Timestamps */}
      {election && (
        <div className="card">
          <p className="font-mono text-xs text-stone uppercase tracking-widest mb-3">Timeline</p>
          <dl className="space-y-2 font-mono text-xs">
            <div className="flex gap-4">
              <dt className="text-stone w-40">Created</dt>
              <dd className="text-warm-white/70">{election.created_at || '—'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-stone w-40">Voting Opened</dt>
              <dd className="text-warm-white/70">{election.voting_opened_at || '—'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-stone w-40">Voting Closed</dt>
              <dd className="text-warm-white/70">{election.voting_closed_at || '—'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-stone w-40">Results Published</dt>
              <dd className="text-warm-white/70">{election.results_published_at || '—'}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
