import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSession, setCurrentUser, setCurrentOrg, setCurrentView, type DemoView } from '../lib/session';
import type { User, Org } from '../../../shared/models';

// No-auth demo helper: two top-level views (seeker "User" / organizer "Org"),
// each with its own identity picker. The view drives which nav items show
// (see AppShell) — switching also jumps to that view's home screen.
export function DemoSwitcher() {
  const { userId, orgId, view } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const navigate = useNavigate();
  useEffect(() => { api.users().then(setUsers).catch(() => {}); }, []);
  useEffect(() => { api.orgs().then(setOrgs).catch(() => {}); }, []);

  function switchView(v: DemoView) {
    setCurrentView(v);
    navigate(v === 'org' ? '/org' : '/feed');
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
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

      {view === 'user' ? (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted sr-only sm:not-sr-only">as</span>
          <select
            aria-label="Viewing as which seeded user"
            className="min-h-[40px] rounded-lg border border-black/15 px-2"
            value={userId}
            onChange={(e) => setCurrentUser(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted sr-only sm:not-sr-only">as</span>
          <select
            aria-label="Viewing as which seeded org"
            className="min-h-[40px] rounded-lg border border-black/15 px-2"
            value={orgId}
            onChange={(e) => setCurrentOrg(e.target.value)}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
