import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { confirm } from '../../utils/confirm';
import { getAllIds, generateIds, invalidateId, reinstateId, exportIdsCsv } from '../../api';

const STATUS_COLORS = {
  generated:            'text-stone border-stone/40',
  registered_candidate: 'text-wheat border-wheat/40',
  voted:                'text-ember border-ember/40',
  invalid:              'text-red-500/60 border-red-500/30',
};

export default function AdminIDs() {
  const [members, setMembers] = useState([]);
  const [qrId, setQrId] = useState(null);
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllIds();
      setMembers(data.sort((a, b) => a.id.localeCompare(b.id)));
    } catch {
      setError('Failed to load IDs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setGenerating(true);
    try {
      const result = await generateIds(Number(count));
      await load();
      toast.success(`Generated ${result.count} new IDs`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate IDs');
    } finally {
      setGenerating(false);
    }
  };

  const handleInvalidate = async (id) => {
    if (!await confirm(`Invalidate ${id}? This member will no longer be able to vote or register.`)) return;
    try {
      await invalidateId(id);
      setMembers(m => m.map(mem => mem.id === id ? { ...mem, status: 'invalid' } : mem));
      toast.success(`${id} invalidated`);
    } catch {
      toast.error('Failed to invalidate ID');
    }
  };

  const handleReinstate = async (id) => {
    try {
      await reinstateId(id);
      setMembers(m => m.map(mem => mem.id === id ? { ...mem, status: 'generated' } : mem));
      toast.success(`${id} reinstated`);
    } catch {
      toast.error('Failed to reinstate ID');
    }
  };

  const filtered = members.filter(m => {
    const matchesSearch = !search || m.id.includes(search.toUpperCase()) || (m.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || m.status === filter;
    return matchesSearch && matchesFilter;
  });

  const counts = members.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-4xl font-bold text-warm-white uppercase tracking-wider">Member IDs</h1>
          <p className="font-mono text-xs text-stone mt-1">{members.length} total IDs</p>
        </div>
        <button onClick={exportIdsCsv} className="btn-ghost text-sm px-4 py-2">Export CSV</button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(counts).map(([status, n]) => (
          <span key={status} className={`tag border font-mono ${STATUS_COLORS[status] || 'text-stone'}`}>
            {status}: {n}
          </span>
        ))}
      </div>

      {/* Generate */}
      <form onSubmit={handleGenerate} className="card flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <label className="font-mono text-xs text-stone uppercase tracking-widest block mb-2">Generate IDs</label>
          <input
            type="number"
            className="input"
            min={1}
            max={500}
            value={count}
            onChange={e => setCount(e.target.value)}
          />
        </div>
        <button type="submit" disabled={generating} className="btn-primary flex-shrink-0">
          {generating ? 'Generating…' : `Generate ${count}`}
        </button>
      </form>

      {error && <p className="text-red-400 font-mono text-sm">{error}</p>}

      {/* Filter & search */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="input flex-1 min-w-[180px] py-2 text-sm"
          placeholder="Search by ID or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input w-auto py-2 text-sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="generated">Generated</option>
          <option value="registered_candidate">Registered Candidate</option>
          <option value="voted">Voted</option>
          <option value="invalid">Invalid</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <p className="font-mono text-stone text-sm animate-pulse">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/30">
                <th className="font-mono text-xs text-stone uppercase tracking-widest text-left py-3 pr-4">ID</th>
                <th className="font-mono text-xs text-stone uppercase tracking-widest text-left py-3 pr-4">Name</th>
                <th className="font-mono text-xs text-stone uppercase tracking-widest text-left py-3 pr-4">Status</th>
                <th className="font-mono text-xs text-stone uppercase tracking-widest text-right py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-stone/10 hover:bg-graphite/50 transition-colors">
                  <td className="font-mono text-warm-white py-3 pr-4">{m.id}</td>
                  <td className="text-stone py-3 pr-4">{m.name || <span className="text-stone/30">—</span>}</td>
                  <td className="py-3 pr-4">
                    <span className={`tag border font-mono text-xs ${STATUS_COLORS[m.status] || ''}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setQrId(m.id)}
                        className="font-mono text-xs text-stone/60 hover:text-stone transition-colors"
                        title="Show QR code"
                      >
                        QR
                      </button>
                      {m.status !== 'invalid' ? (
                        <button
                          onClick={() => handleInvalidate(m.id)}
                          className="font-mono text-xs text-red-500/70 hover:text-red-400 transition-colors"
                        >
                          Invalidate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReinstate(m.id)}
                          className="font-mono text-xs text-wheat/70 hover:text-wheat transition-colors"
                        >
                          Reinstate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="font-mono text-stone text-sm py-8 text-center">No IDs match your filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {qrId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setQrId(null)}
        >
          <div
            className="bg-carbon border border-stone/30 p-8 space-y-4 flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-mono text-warm-white tracking-widest text-lg">{qrId}</p>
            <QRCodeSVG value={qrId} size={200} bgColor="#1E1E1E" fgColor="#F0EBE0" />
            <p className="font-mono text-xs text-stone">Member scans this to enter their ID</p>
            <button onClick={() => setQrId(null)} className="btn-ghost w-full text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
