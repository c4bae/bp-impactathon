// =====================================================================
// Demo "session" — NO real auth (deliberate scope choice). A seeded user
// and org id, swappable via the header switcher. Every screen reads the
// current ids from here instead of hardcoding them.
// =====================================================================
import { useSyncExternalStore } from 'react';

export const DEMO_USER_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_ORG_ID = '22222222-2222-2222-2222-222222222222';

export type DemoView = 'user' | 'org';

const KEY_USER = 'kwhab.user_id';
const KEY_ORG = 'kwhab.org_id';
const KEY_VIEW = 'kwhab.view';

let userId = localStorage.getItem(KEY_USER) || DEMO_USER_ID;
let orgId = localStorage.getItem(KEY_ORG) || DEMO_ORG_ID;
let view = (localStorage.getItem(KEY_VIEW) as DemoView) || 'user';
let snapshot = { userId, orgId, view };

const listeners = new Set<() => void>();
function emit() {
  snapshot = { userId, orgId, view }; // new ref so subscribers re-render
  listeners.forEach((l) => l());
}

export function setCurrentUser(id: string) {
  userId = id; localStorage.setItem(KEY_USER, id); emit();
}
export function setCurrentOrg(id: string) {
  orgId = id; localStorage.setItem(KEY_ORG, id); emit();
}
export function setCurrentView(v: DemoView) {
  view = v; localStorage.setItem(KEY_VIEW, v); emit();
}
export function getCurrentUserId() { return userId; }
export function getCurrentOrgId() { return orgId; }
export function getCurrentView() { return view; }

function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

/** Reactive hook — re-renders when the demo user/org/view changes. */
export function useSession(): { userId: string; orgId: string; view: DemoView } {
  return useSyncExternalStore(subscribe, () => snapshot);
}
