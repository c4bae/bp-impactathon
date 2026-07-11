import { useNavigate } from 'react-router-dom';
import { useSession, setCurrentView, type DemoView } from '../lib/session';

// No-auth demo helper: two top-level views (seeker "User" / organizer
// "Org"). The view drives which nav items show (see AppShell) — switching
// also jumps to that view's home screen. No per-persona picker: User view
// is always the default demo user, Org view is always the default demo
// org (session.ts still supports overriding either via localStorage —
// e.g. for e2e tests driving a specific seeded persona — there's just no
// in-app control for it).
export function DemoSwitcher() {
  const { view } = useSession();
  const navigate = useNavigate();

  function switchView(v: DemoView) {
    setCurrentView(v);
    navigate(v === 'org' ? '/org' : '/feed');
  }

  return (
    <div role="group" aria-label="Switch view" className="flex rounded-full border border-black/15 p-0.5">
      <button
        type="button"
        aria-pressed={view === 'user'}
        onClick={() => switchView('user')}
        className={`min-h-[36px] px-3 rounded-full text-sm font-medium transition ${
          view === 'user' ? 'bg-brand text-white' : 'text-muted hover:bg-brand-light'
        }`}
      >
        <span aria-hidden>👤</span> User
      </button>
      <button
        type="button"
        aria-pressed={view === 'org'}
        onClick={() => switchView('org')}
        className={`min-h-[36px] px-3 rounded-full text-sm font-medium transition ${
          view === 'org' ? 'bg-brand text-white' : 'text-muted hover:bg-brand-light'
        }`}
      >
        <span aria-hidden>🏢</span> Org
      </button>
    </div>
  );
}
