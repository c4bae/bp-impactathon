// =====================================================================
// Demo "session" — NO real auth (deliberate scope choice). A seeded user
// and org id, swappable via the header switcher. Every screen reads the
// current ids from here instead of hardcoding them.
// =====================================================================
import { useSyncExternalStore } from 'react';

export const DEMO_USER_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_ORG_ID = '22222222-2222-2222-2222-222222222222';

const KEY_USER = 'kwhab.user_id';
const KEY_ORG = 'kwhab.org_id';

let userId = localStorage.getItem(KEY_USER) || DEMO_USER_ID;
let orgId = localStorage.getItem(KEY_ORG) || DEMO_ORG_ID;
let snapshot = { userId, orgId };

const listeners = new Set<() => void>();
function emit() {
  snapshot = { userId, orgId }; // new ref so subscribers re-render
  listeners.forEach((l) => l());
}

export function setCurrentUser(id: string) {
  userId = id; localStorage.setItem(KEY_USER, id); emit();
}
export function setCurrentOrg(id: string) {
  orgId = id; localStorage.setItem(KEY_ORG, id); emit();
}
export function getCurrentUserId() { return userId; }
export function getCurrentOrgId() { return orgId; }

function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

/** Reactive hook — re-renders when the demo user/org changes. */
export function useSession(): { userId: string; orgId: string } {
  return useSyncExternalStore(subscribe, () => snapshot);
}
