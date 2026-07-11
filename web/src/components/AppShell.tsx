import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DemoSwitcher } from './DemoSwitcher';

const seekerNav = [
  { to: '/', label: 'Discover', end: true },
  { to: '/calendar', label: 'Calendar' },
  { to: '/quick-picks', label: 'Quick Picks' },
  { to: '/my-signups', label: 'My Signups' },
];
const orgNav = [
  { to: '/org', label: 'Dashboard' },
  { to: '/admin/new', label: 'Post Event' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [aiMode, setAiMode] = useState<'mock' | 'live' | null>(null);
  useEffect(() => { api.aiStatus().then((s) => setAiMode(s.mode)).catch(() => {}); }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="skip-link">Skip to content</a>

      {aiMode === 'mock' && (
        <div className="bg-amber-100 text-amber-900 text-center text-sm py-1 px-2">
          AI running in <strong>mock mode</strong> — deterministic offline responses. Set <code>AI_MODE=live</code> for real OpenRouter/ElevenLabs.
        </div>
      )}

      <header className="border-b border-black/5 bg-white/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <NavLink to="/" className="font-bold text-brand-dark text-lg">KW Hab · Discover</NavLink>
          <DemoSwitcher />
        </div>
        <nav aria-label="Primary" className="max-w-6xl mx-auto px-2 pb-2 flex gap-1 items-center overflow-x-auto">
          {seekerNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-full text-sm whitespace-nowrap ${isActive ? 'bg-brand-light text-brand-dark font-medium' : 'text-muted hover:bg-brand-light/60'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <span className="flex-1" aria-hidden />
          <span className="text-xs text-muted uppercase tracking-wide pl-2 hidden sm:inline">For organizers</span>
          {orgNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-full text-sm whitespace-nowrap ${isActive ? 'bg-brand-light text-brand-dark font-medium' : 'text-muted/80 hover:bg-brand-light/60'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main id="main" className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-black/10 text-center text-muted text-sm py-4">
        KW Hab Community Discovery — hackathon MVP. Accommodation tags are functional needs, never diagnoses.
      </footer>
    </div>
  );
}
