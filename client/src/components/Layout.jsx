import { Link } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-carbon">
      <header className="border-b border-stone/30 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-heading font-bold text-2xl tracking-widest text-warm-white uppercase">
          THE <span className="text-ember">FLUX</span>
        </Link>
        <span className="font-mono text-xs text-stone uppercase tracking-widest">EXCO Election 2026</span>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        {children}
      </main>
      <footer className="border-t border-stone/20 px-6 py-6 text-center">
        <p className="font-mono text-xs text-stone">The Flux · NIBM School of Computing &amp; Engineering</p>
      </footer>
    </div>
  );
}
