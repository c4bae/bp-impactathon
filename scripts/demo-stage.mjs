// Stage the database for the 2:30 live demo (docs/demo-runbook.md).
//
// Fresh seed puts Games at the Hangout at 5 accommodation_gap reports — already
// flipped. The demo needs it ONE report shy so the presenter (as Ava) files
// the 5th live and the audience watches the badge flip. This script:
//   1. resets the DB to the seed,
//   2. removes Ava's seeded Kitchen signup (she signs up live on stage),
//   3. sets Elu's 'partial' attendance to 'no' so the pre-demo badge reads
//      "Not yet verified" rather than a confusing "confirmed",
//   4. triggers the server's own badge recompute and verifies the result.
//
// Run with the dev servers up:  node scripts/demo-stage.mjs
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const API = 'http://localhost:4000';
const FEATURED_EVENT = '33333333-0000-0000-0000-000000000002';
const AVA = '11111111-1111-1111-1111-000000000002';
const BEN = '11111111-1111-1111-1111-000000000003';
const ELU = '11111111-1111-1111-1111-000000000006';

export async function stage() {
  execSync('npm run db:reset', { cwd: ROOT, stdio: 'pipe' });

  const sql = `
    DELETE FROM signups WHERE event_id='${FEATURED_EVENT}' AND user_id='${AVA}';
    UPDATE signups SET attended='no' WHERE event_id='${FEATURED_EVENT}' AND user_id='${ELU}';
    SELECT COUNT(*) AS gap_reports FROM signups
      WHERE event_id='${FEATURED_EVENT}' AND blocker='accommodation_gap';
  `;
  const out = execSync('bash scripts/db.sh psql', { cwd: ROOT, input: sql }).toString();
  if (!/^\s*4\s*$/m.test(out)) {
    throw new Error(`expected exactly 4 staged accommodation_gap reports, psql said:\n${out}`);
  }

  // Recompute the badge through the server's real logic (a same-values PATCH
  // on Ben's report), so staging exercises the code path the demo relies on.
  const bens = await (await fetch(`${API}/api/signups?user_id=${BEN}`)).json();
  const ben = bens.find((s) => s.event_id === FEATURED_EVENT);
  if (!ben) throw new Error('Ben has no Games at the Hangout signup — seed changed?');
  const res = await (await fetch(`${API}/api/signups/${ben.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attended: ben.attended, blocker: ben.blocker }),
  })).json();
  if (res.event_badge_state !== 'not_yet_verified') {
    throw new Error(`expected Kitchen badge not_yet_verified after staging, got ${res.event_badge_state}`);
  }
  return res.event_badge_state;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await stage();
    console.log('✅ Demo staged: Games at the Hangout at 4 gap reports, badge "Not yet verified".');
    console.log('   Presenter checklist: header dropdown → user "Ava", open /feed. Runbook: docs/demo-runbook.md');
  } catch (err) {
    console.error('❌ Staging failed (are the dev servers running? `npm run dev`)');
    console.error(String(err?.message || err));
    process.exit(1);
  }
}
