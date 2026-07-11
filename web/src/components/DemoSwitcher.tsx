import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useSession, setCurrentUser } from '../lib/session';
import type { User } from '../../../shared/models';

// No-auth demo helper: pick which seeded user you're browsing as.
export function DemoSwitcher() {
  const { userId } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => { api.users().then(setUsers).catch(() => {}); }, []);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Viewing as</span>
      <select
        className="min-h-[40px] rounded-lg border border-black/15 px-2"
        value={userId}
        onChange={(e) => setCurrentUser(e.target.value)}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </label>
  );
}
