import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getElectionState } from '../api';

const PHASE_MESSAGES = {
  SETUP:        { label: 'Pre-Election',  description: 'The election has not opened yet. Check back soon.' },
  REGISTRATION: { label: 'Registration Open', description: 'Candidates are now registering. Members can sign up to run for a position.' },
  VOTING:       { label: 'Voting Open',   description: 'Voting is now live. Use your Member ID to cast your votes.' },
  RESULTS:      { label: 'Voting Closed', description: 'Voting has ended. Results will be published shortly.' },
  PUBLISHED:    { label: 'Results Published', description: 'The election results are now available.' },
};

export default function Landing() {
  const [phase, setPhase] = useState(null);

  useEffect(() => {
    getElectionState().then(d => setPhase(d.phase)).catch(() => {});
  }, []);

  const info = phase ? PHASE_MESSAGES[phase] : null;

  return (
    <Layout>
      <div className="text-center mb-16">
        <h1 className="font-heading text-6xl md:text-8xl font-bold text-warm-white uppercase tracking-widest mb-2">
          The <span className="text-ember">Flux</span>
        </h1>
        <p className="font-mono text-stone text-sm uppercase tracking-widest">
          EXCO Election 2026 · NIBM School of Computing &amp; Engineering
        </p>
      </div>

      {info && (
        <div className="card mb-10 border-l-4 border-ember">
          <div className="flex items-center gap-3 mb-2">
            <span className="tag bg-ember text-white">{info.label}</span>
          </div>
          <p className="text-warm-white/80">{info.description}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {phase === 'REGISTRATION' && (
          <Link to="/register" className="card hover:border-ember transition-colors group">
            <h2 className="font-heading text-2xl font-bold text-warm-white uppercase mb-2 group-hover:text-ember transition-colors">
              Register as Candidate
            </h2>
            <p className="text-stone text-sm">Run for an EXCO position. Enter your Member ID to begin.</p>
          </Link>
        )}

        {phase === 'VOTING' && (
          <Link to="/vote" className="card hover:border-ember transition-colors group">
            <h2 className="font-heading text-2xl font-bold text-warm-white uppercase mb-2 group-hover:text-ember transition-colors">
              Cast Your Vote
            </h2>
            <p className="text-stone text-sm">Voting is open. Enter your Member ID to vote.</p>
          </Link>
        )}

        {phase === 'PUBLISHED' && (
          <Link to="/results" className="card hover:border-ember transition-colors group sm:col-span-2">
            <h2 className="font-heading text-2xl font-bold text-warm-white uppercase mb-2 group-hover:text-ember transition-colors">
              View Results
            </h2>
            <p className="text-stone text-sm">The election results are now published.</p>
          </Link>
        )}

        <Link to="/register" className={`card hover:border-stone/60 transition-colors group ${phase !== 'REGISTRATION' ? 'block' : 'hidden'}`}>
          <h2 className="font-heading text-xl font-bold text-stone uppercase mb-1">Candidate Registration</h2>
          <p className="text-stone/60 text-sm">{phase === 'REGISTRATION' ? 'Open' : 'Currently closed'}</p>
        </Link>

        <Link to="/vote" className={`card hover:border-stone/60 transition-colors group ${phase !== 'VOTING' ? 'block' : 'hidden'}`}>
          <h2 className="font-heading text-xl font-bold text-stone uppercase mb-1">Voter Portal</h2>
          <p className="text-stone/60 text-sm">{phase === 'VOTING' ? 'Open' : 'Currently closed'}</p>
        </Link>
      </div>

      <div className="mt-16 border-t border-stone/20 pt-8">
        <h3 className="font-heading text-lg font-bold text-stone uppercase tracking-wider mb-4">EXCO Positions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {['President', 'Vice President', 'General Secretary', 'Treasurer', 'Director of Operations', 'Director of PR and Marketing'].map(pos => (
            <div key={pos} className="font-mono text-xs text-stone/60 border border-stone/20 px-3 py-2">{pos}</div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
