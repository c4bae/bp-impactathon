import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DemoSwitcher } from './DemoSwitcher';
import { useSession } from '../lib/session';
import { AccessibilityMenu } from './AccessibilityMenu';

// Two disjoint nav sets — which one shows depends on the View toggle in
// DemoSwitcher, mirroring the two real audiences this product has (seekers
// vs. organizers). Neither list gates route access, just what's in the nav.
// '/' and '/feed' render the same Discover screen now, so just one entry.
// Calendar is genuinely dual-purpose (browses the seeker feed, but its
// modal also does org-owned create/edit/delete) — it's in both lists.
const USER_NAV = [
  { to: '/', label: 'Discover', end: true },
  { to: '/calendar', label: 'Calendar' },
  { to: '/my-signups', label: 'My Signups' },
];
const ORG_NAV = [
  { to: '/org', label: 'Dashboard', end: true },
  { to: '/calendar', label: 'Calendar' },
  { to: '/admin/new', label: 'Post Event' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [aiMode, setAiMode] = useState<'mock' | 'live' | null>(null);
  const { view } = useSession();
  const navItems = view === 'org' ? ORG_NAV : USER_NAV;
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
        <nav aria-label="Primary" className="max-w-6xl mx-auto px-2 pb-2 flex gap-1 overflow-x-auto">
          {navItems.map((n) => (
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
        </nav>
      </header>

      <main id="main" className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-black/10 text-center text-muted text-sm py-4">
        KW Hab Community Discovery — hackathon MVP. Accommodation tags are functional needs, never diagnoses.
      </footer>
      <AccessibilityMenu />
    </div>
  );
}
