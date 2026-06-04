import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { validateMember, getCandidates, registerCandidate, getElectionState } from '../api';

export default function Register() {
  const [phase, setPhase] = useState(null);
  const [step, setStep] = useState('id'); // 'id' | 'form' | 'done'
  const [memberId, setMemberId] = useState('');
  const [member, setMember] = useState(null);
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState({ name: '', positionId: '', bio: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getElectionState().then(d => setPhase(d.phase)).catch(() => {});
  }, []);

  const handleValidate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await validateMember(memberId.trim());
      setMember(data);
      const candidates = await getCandidates();
      setPositions(candidates.filter(p => !p.registrationClosed));
      setForm(f => ({ ...f, name: data.name || '' }));
      setStep('form');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to validate ID');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.positionId) { setError('Please select a position'); return; }
    setLoading(true);
    try {
      await registerCandidate({
        memberId: member.memberId,
        name: form.name,
        positionId: form.positionId,
        bio: form.bio,
      });
      setSuccess(`You've been registered as a candidate for the selected position.`);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (phase && phase !== 'REGISTRATION') {
    return (
      <Layout>
        <div className="card border-l-4 border-stone">
          <h2 className="font-heading text-2xl font-bold text-warm-white uppercase mb-2">Registration Closed</h2>
          <p className="text-stone">Candidate registration is not currently open.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="font-heading text-5xl font-bold text-warm-white uppercase tracking-widest mb-2">
        Candidate <span className="text-ember">Registration</span>
      </h1>
      <p className="text-stone font-mono text-sm mb-10">Register to run for an EXCO position</p>

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
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
      )}

      {step === 'form' && (
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="card border-l-4 border-ember">
            <p className="font-mono text-xs text-stone uppercase tracking-widest mb-1">Authenticated as</p>
            <p className="font-mono text-ember text-lg">{member.memberId}</p>
          </div>

          <div>
            <label className="font-mono text-xs text-stone uppercase tracking-widest block mb-2">Full Name *</label>
            <input
              className="input"
              placeholder="Your full name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="font-mono text-xs text-stone uppercase tracking-widest block mb-2">Position *</label>
            <select
              className="input"
              value={form.positionId}
              onChange={e => setForm(f => ({ ...f, positionId: e.target.value }))}
              required
            >
              <option value="">Select a position…</option>
              {positions
                .filter(p => !member.registeredPositions?.includes(p.id))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.candidates.length}/3 candidates)
                  </option>
                ))}
            </select>
            {positions.filter(p => !member.registeredPositions?.includes(p.id)).length === 0 && (
              <p className="font-mono text-xs text-stone mt-2">No open positions available.</p>
            )}
          </div>

          <div>
            <label className="font-mono text-xs text-stone uppercase tracking-widest block mb-2">
              Short Statement <span className="text-stone/50">(optional · 50–100 words)</span>
            </label>
            <textarea
              className="input resize-none h-28"
              placeholder="Why are you running for this position?"
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            />
          </div>

          {member.registeredPositions?.length > 0 && (
            <div className="card">
              <p className="font-mono text-xs text-stone uppercase tracking-widest mb-2">Already registered for</p>
              <ul className="space-y-1">
                {member.registeredPositions.map(pid => (
                  <li key={pid} className="font-mono text-xs text-wheat">{pid}</li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-red-400 font-mono text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('id')} className="btn-ghost flex-1">Back</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Registering…' : 'Register as Candidate'}
            </button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <div className="card border-l-4 border-ember space-y-4">
          <h2 className="font-heading text-3xl font-bold text-ember uppercase">Registered!</h2>
          <p className="text-warm-white">{success}</p>
          <p className="text-stone font-mono text-sm">Your name will appear on the ballot when voting opens.</p>
          <button
            onClick={() => { setStep('id'); setMemberId(''); setMember(null); setForm({ name: '', positionId: '', bio: '' }); }}
            className="btn-ghost"
          >
            Register for Another Position
          </button>
        </div>
      )}
    </Layout>
  );
}
