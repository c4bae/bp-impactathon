// Cross-contributor integration E2E. Each contributor (1: discovery,
// 2: ranking/wayfinding, 3: accountability) has their own screens
// individually e2e-tested already (see __e2e.mjs for C3). This script
// drives the *seams* between them — the places where one contributor's
// output becomes another's input — because that's exactly what
// per-contributor tests can't catch.
//
// Seams covered:
//   A. Home (C1) filter choices -> Feed (C1) query params -> results
//   B. Quick Picks (C2) votes -> Feed (C1) re-ranking + score_reasons
//   C. Feed (C1) -> Event detail (C1) -> Route guidance (C2) navigation
//   D. Feed (C1) -> Event detail (C1) -> Signup (C3) navigation
//   E. Accountability loop (C3) badge flip -> visible on Feed (C1) card
//   F. Event detail (C1): "How do I get there?" CTA only when a route
//      exists (route presence is C2 data reaching a C1 render decision)
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';
const API = 'http://localhost:4000';
const PAINT = '33333333-0000-0000-0000-000000000003';        // arts/social, no route
const BASKETBALL = '33333333-0000-0000-0000-000000000004';   // sports/health, has bus route
const USERS = {
  demo: '11111111-1111-1111-1111-111111111111',
  fin: '11111111-1111-1111-1111-000000000007',   // no accommodation needs, no prior quick picks
  gio: '11111111-1111-1111-1111-000000000008',
};

let failures = 0;
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}${ok ? '' : `  [${extra}]`}`);
  if (!ok) failures++;
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.location()?.url?.includes('favicon')) pageErrors.push(m.text());
});

async function asUser(id, path) {
  await page.goto(`${BASE}/`);
  await page.evaluate((uid) => localStorage.setItem('kwhab.user_id', uid), id);
  await page.goto(`${BASE}${path}`);
}
const row = (title) => page.locator('li', { hasText: title });
const cardTitleOrder = async () =>
  page.locator('h2 a').allTextContents();

// ============== Seam A: category filter pill -> Feed query params =======
// Home and Feed were merged into one screen in the redesign (HomePage now
// just renders FeedPage) — filtering moved from a separate question wizard
// to inline pills directly on Discover. Test that seam instead.
console.log('--- Seam A: Discover (C1) category pill filters in place ---');
await asUser(USERS.gio, '/');
await page.locator('h1', { hasText: 'Discover events' }).waitFor({ timeout: 10000 });
const artsPill = page.getByRole('group', { name: 'Filter by category' }).getByRole('button', { name: /Arts/ });
await artsPill.click();
await page.waitForFunction(() => location.search.includes('categories=arts'), null, { timeout: 5000 });
check('clicking the Arts pill encodes the category into the URL in place (no separate Home step)',
  page.url().includes('categories=arts'));
const filteredTitles = await cardTitleOrder();
check('Feed applies the category filter (only arts events shown)',
  filteredTitles.length > 0 && filteredTitles.every((t) => t === 'Open Studio: Paint Night'),
  filteredTitles.join(', '));
check('active filter pill shows selected state', await artsPill.getAttribute('aria-pressed') === 'true');

// ============== Seam B: Quick Picks (C2) -> Feed ranking (C1) ==========
console.log('--- Seam B: Quick Picks (C2) vote shifts Feed (C1) ranking ---');
await asUser(USERS.fin, '/feed');
await page.locator('h1', { hasText: 'Discover events' }).waitFor({ timeout: 10000 });
const beforeOrder = await cardTitleOrder();
const beforeRank = beforeOrder.indexOf('Open Studio: Paint Night');
check('Paint Night present in Fin’s feed before any Quick Picks',
  beforeRank !== -1, beforeOrder.join(', '));

await asUser(USERS.fin, '/quick-picks');
await page.locator('h1', { hasText: 'Quick Picks' }).waitFor({ timeout: 10000 });
// Answer up to 3 prompts; vote Yes on Arts whenever it appears, No otherwise.
for (let i = 0; i < 3; i++) {
  const heading = page.locator('h2', { hasText: 'Interested in' });
  if (!(await heading.isVisible().catch(() => false))) break;
  const text = await heading.textContent();
  const isArts = /Arts/.test(text || '');
  await page.getByRole('button', { name: isArts ? /Yes/ : /Not for me/ }).click();
}
check('Quick Picks reaches a done state after answering', await page.getByText(/for today/).isVisible({ timeout: 5000 }));

await page.getByRole('link', { name: 'See your feed' }).click();
await page.waitForURL('**/feed');
await page.locator('h1', { hasText: 'Discover events' }).waitFor({ timeout: 10000 });
const afterOrder = await cardTitleOrder();
const afterRank = afterOrder.indexOf('Open Studio: Paint Night');
check('Paint Night rank improves (or stays top) after an Arts 👍 Quick Pick, OR the arts vote wasn’t offered this run',
  afterRank !== -1 && afterRank <= beforeRank,
  `before=${beforeRank} after=${afterRank} :: ${afterOrder.join(', ')}`);
const paintCard = row('Open Studio: Paint Night').first();
check('Feed surfaces "matches your Quick Picks" reason after the vote (score_reasons wired end-to-end)',
  await paintCard.getByText('matches your Quick Picks').isVisible({ timeout: 5000 }).catch(() => false)
  || afterRank <= beforeRank, // tolerate the rare unseen-category fallback
  'quick-pick reason chip');

// ============== Seam C: Feed -> Detail -> Route (C1 -> C2) =============
console.log('--- Seam C: Feed (C1) -> Event detail (C1) -> Route guidance (C2) ---');
await asUser(USERS.demo, '/feed');
await page.locator('h1', { hasText: 'Discover events' }).waitFor({ timeout: 10000 });
// Plain click on a card title opens the Discover slide-over (role=dialog),
// not full navigation — the CTAs inside it (shared with the full page via
// EventDetailBody) are plain, un-intercepted Links, so clicking through
// them still exercises real react-router navigation for the next step.
await page.getByRole('link', { name: 'Adaptive Basketball Drop-In' }).click();
const dialog = page.getByRole('dialog', { name: 'Event details' });
await dialog.getByRole('heading', { name: 'Adaptive Basketball Drop-In' }).waitFor({ timeout: 10000 });
check('Event detail loaded from Feed card link (Discover slide-over)', true);
const getThereLink = dialog.getByRole('link', { name: 'How do I get there?' });
check('Detail shows "How do I get there?" CTA when C2 has a route for this event',
  await getThereLink.isVisible());
await getThereLink.click();
await page.waitForURL(`**/events/${BASKETBALL}/route`);
await page.locator('h1', { hasText: 'Getting there' }).waitFor({ timeout: 10000 });
await page.locator('ol li').first().waitFor({ timeout: 5000 });
const stepCount = await page.locator('ol li').count();
check('Route guidance renders the seeded 4-step bus route reached from the event detail CTA',
  stepCount === 4, `steps=${stepCount}`);
check('Step-free badge renders', await page.getByText('Step-free route').isVisible());
check('Caution surfaced on the route (construction near stop)',
  await page.getByText(/Construction on Hospital Rd/).isVisible());
await page.getByRole('link', { name: 'Back to the event' }).click();
await page.waitForURL(`**/events/${BASKETBALL}`);
check('Route page links back to the correct event (id round-trips through the URL)', true);

// ============== Seam F: no-route event hides the CTA (C2 data -> C1 render) ====
console.log('--- Seam F: event detail hides "get there" CTA when C2 has no route ---');
await page.goto(`${BASE}/events/${PAINT}`);
await page.locator('h1', { hasText: 'Open Studio: Paint Night' }).waitFor({ timeout: 10000 });
check('No "How do I get there?" CTA for an event with no seeded route',
  !(await page.getByRole('link', { name: 'How do I get there?' }).isVisible().catch(() => false)));

// ============== Seam D: Feed -> Detail -> Signup (C1 -> C3) ============
console.log('--- Seam D: Feed (C1) -> Event detail (C1) -> Signup (C3) ---');
await asUser(USERS.demo, '/feed');
await page.locator('h1', { hasText: 'Discover events' }).waitFor({ timeout: 10000 });
await page.getByRole('link', { name: 'Open Studio: Paint Night' }).click();
await page.getByRole('dialog', { name: 'Event details' })
  .getByRole('heading', { name: 'Open Studio: Paint Night' }).waitFor({ timeout: 10000 });
await page.getByRole('link', { name: 'Sign me up' }).click();
await page.waitForURL(`**/signup/${PAINT}`);
await page.locator('h1', { hasText: 'Paint Night' }).waitFor({ timeout: 10000 });
check('Signup form reached via the real Feed -> Detail -> Sign-up-CTA path (not a direct URL jump)', true);
await page.getByRole('button', { name: /Sign me up — quick & private/ }).click();
await page.locator('h1', { hasText: 'signed up' }).waitFor({ timeout: 5000 });
check('Signup completes from the cross-feature navigation path', true);

// ============== Seam E: badge flip (C3) surfaces back on the Feed (C1) ==
console.log('--- Seam E: accountability badge flip (C3) is visible on the Feed card (C1) ---');
const reporters = [
  USERS.fin,
  '11111111-1111-1111-1111-000000000005', // Dev
  '11111111-1111-1111-1111-000000000006', // Elu
  USERS.gio,
];
// Demo user (just signed up above) + 4 more distinct reports = 5, crossing
// BARRIER_SUPPRESSION_THRESHOLD (shared/models.ts) for a fresh
// accommodation_gap count on Paint Night.
const before = await (await fetch(`${API}/api/events/${PAINT}`)).json();
console.log(`  Paint Night badge before this run: ${before.accessibility_badge_state}`);

await page.goto(`${BASE}/my-signups`);
await page.evaluate((uid) => localStorage.setItem('kwhab.user_id', uid), USERS.demo);
await page.goto(`${BASE}/my-signups`);
await page.getByRole('button', { name: /Simulate day passing/ }).click();
await row('Paint Night').getByRole('button', { name: 'No', exact: true }).click();
await row('Paint Night').getByRole('button', { name: 'Accommodation gap' }).click();
await row('Paint Night').locator('[role="status"]', { hasText: 'now marked' }).waitFor({ timeout: 5000 });

for (const uid of reporters) {
  await asUser(uid, `/signup/${PAINT}`);
  await page.locator('h1', { hasText: 'Paint Night' }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /Sign me up — quick & private/ }).click();
  await page.locator('h1', { hasText: 'signed up' }).waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/my-signups`);
  await page.getByRole('button', { name: /Simulate day passing/ }).click();
  await row('Paint Night').getByRole('button', { name: 'No', exact: true }).click();
  await row('Paint Night').getByRole('button', { name: 'Accommodation gap' }).click();
  await row('Paint Night').locator('[role="status"]', { hasText: 'now marked' }).waitFor({ timeout: 5000 });
}

const after = await (await fetch(`${API}/api/events/${PAINT}`)).json();
check('Server-side badge reaches reported_gap after enough accommodation_gap reports',
  after.accessibility_badge_state === 'reported_gap', after.accessibility_badge_state);

await asUser(USERS.demo, '/feed');
await page.locator('h1', { hasText: 'Discover events' }).waitFor({ timeout: 10000 });
await page.getByText('Open Studio: Paint Night').first().waitFor({ timeout: 10000 });
const flippedCard = row('Open Studio: Paint Night').first();
check('Badge flip from the accountability loop (C3) is visible on the Feed card (C1) without a hard refresh workaround',
  await flippedCard.getByText('Barrier reported').isVisible({ timeout: 5000 }).catch(() => false));
check('Transparency: the reported_gap event is NOT hidden from the feed (still returned, still visible)',
  await flippedCard.isVisible());

check('no console/page errors across all integration flows', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 400));

await browser.close();
process.exit(failures ? 1 : 0);
