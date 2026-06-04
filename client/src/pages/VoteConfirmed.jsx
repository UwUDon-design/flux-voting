import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function VoteConfirmed() {
  return (
    <Layout>
      <div className="text-center space-y-8">
        <div className="inline-block border-4 border-ember p-6 mb-4">
          <span className="font-heading text-7xl font-bold text-ember">✓</span>
        </div>
        <div>
          <h1 className="font-heading text-5xl font-bold text-warm-white uppercase tracking-widest mb-4">
            Vote <span className="text-ember">Confirmed</span>
          </h1>
          <p className="text-warm-white/80 max-w-md mx-auto">
            Your votes have been recorded. Thank you for participating in The Flux EXCO Election 2026.
          </p>
        </div>
        <p className="font-mono text-stone text-sm">
          Results will be published by the election administrator after voting closes.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/vote" className="btn-ghost">Back to Voter Portal</Link>
          <Link to="/" className="btn-primary">Return Home</Link>
        </div>
      </div>
    </Layout>
  );
}
