// Throwaway headless-browser E2E for the accountability flows.
// Drives the real app (vite:5173 -> api:4000 -> seeded Postgres) in Chrome.
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';
const PAINT = '33333333-0000-0000-0000-000000000003';
const USERS = {
  demo: '11111111-1111-1111-1111-111111111111',
  ava: '11111111-1111-1111-1111-000000000002',
  ben: '11111111-1111-1111-1111-000000000003',
  cara: '11111111-1111-1111-1111-000000000004',
  dev: '11111111-1111-1111-1111-000000000005',
  elu: '11111111-1111-1111-1111-000000000006',
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
  // the project ships no favicon; Chrome's automatic /favicon.ico 404 is noise
  if (m.type() === 'error' && !m.location()?.url?.includes('favicon')) pageErrors.push(m.text());
});

async function asUser(id, path) {
  await page.goto(`${BASE}/`);
  await page.evaluate((uid) => localStorage.setItem('kwhab.user_id', uid), id);
  await page.goto(`${BASE}${path}`);
}
const row = (title) => page.locator('li', { hasText: title });

// ================= Flow A — signup form (Demo User) =================
console.log('--- Flow A: signup form ---');
await asUser(USERS.demo, `/signup/${PAINT}`);
await page.locator('h1', { hasText: 'Paint Night' }).waitFor({ timeout: 10000 });
check('event title loads', true);
await page.waitForFunction(
  () => document.querySelectorAll('input[type=checkbox]:checked').length === 2,
  null, { timeout: 5000 },
).catch(() => {});
check('name prefilled from demo user',
  (await page.locator('#signup-name').inputValue()) === 'Demo User');
const preChecked = await page.locator('input[type=checkbox]:checked').count();
check('saved needs (step-free, plain language) pre-checked', preChecked === 2, `checked=${preChecked}`);
check('consent copy visible', await page.getByText('never a medical label').isVisible());
check('quick/private signup double-branded at the top',
  await page.getByText('Quick signup').isVisible() && await page.getByText('Private signup').isVisible());
const skipBtn = page.getByRole('button', { name: /Sign me up — quick & private/ });
const skipBox = await skipBtn.boundingBox();
check('quick/private signup button prominent (>=44px tall)', !!skipBox && skipBox.height >= 44, `h=${skipBox?.height}`);

// keyboard: focus the Quiet space checkbox and toggle with Space
const quiet = page.locator('label', { hasText: 'Quiet space' }).locator('input');
await quiet.focus();
await page.keyboard.press('Space');
check('checkbox toggles via keyboard (Space)', await quiet.isChecked());

await page.getByRole('button', { name: 'Save these details and sign up' }).click();
await page.locator('h1', { hasText: 'signed up' }).waitFor({ timeout: 5000 });
check('success confirmation shown', true);
check('shared needs echoed as chips (incl. keyboard-checked one)',
  await page.getByText('Quiet space', { exact: true }).isVisible());
await page.getByRole('link', { name: 'See my signups' }).click();
await page.waitForURL('**/my-signups');
check('success links through to /my-signups', true);

// ================= Flow B — follow-up (Demo User) ====================
console.log('--- Flow B: my signups + follow-up ---');
await row('Make It Mondays').locator('text=You went').waitFor({ timeout: 10000 });
check('already-reported signup shows status', true);
const rowCount = await page.locator('li').count();
check('lists all 3 signups', rowCount === 3, `rows=${rowCount}`);
check('future event hides prompt before simulate',
  await row('Summer Baking').getByText('check in with you after').isVisible());

await page.getByRole('button', { name: /Simulate day passing/ }).click();
await row('Summer Baking').locator('legend', { hasText: 'Did you go?' }).waitFor({ timeout: 5000 });
check('simulate reveals follow-up prompts', true);

// one-tap YES on Transit Tuesdays -> badge recomputes to confirmed
await row('Transit Tuesdays').getByRole('button', { name: 'Yes, I went' }).click();
await row('Transit Tuesdays').locator('[role="status"]', { hasText: 'now marked' }).waitFor({ timeout: 5000 });
check('one-tap "yes" reports and surfaces badge',
  (await row('Transit Tuesdays').locator('[role="status"]', { hasText: 'now marked' }).textContent())
    .includes('Accessibility confirmed'));

// NO + "Prefer not to say" on Paint Night (optional blocker honored)
await row('Summer Baking').getByRole('button', { name: 'No', exact: true }).click();
await row('Summer Baking').locator('legend', { hasText: 'What got in the way?' }).waitFor({ timeout: 5000 });
check('blocker question revealed after "No"', true);
await row('Summer Baking').getByRole('button', { name: 'Prefer not to say' }).click();
await row('Summer Baking').locator('[role="status"]', { hasText: 'now marked' }).waitFor({ timeout: 5000 });
const pnts = await row('Summer Baking').locator('[role="status"]', { hasText: 'now marked' }).textContent();
check('"Prefer not to say" submits, badge stays unverified',
  pnts.includes('Not yet verified'), pnts);

// ================= Flow C — the badge flip ===========================
console.log('--- Flow C: 5 users report accommodation_gap -> badge flips ---');
const reporters = [USERS.ava, USERS.ben, USERS.cara, USERS.dev, USERS.elu];
for (let i = 0; i < reporters.length; i++) {
  await asUser(reporters[i], `/signup/${PAINT}`);
  await page.locator('h1', { hasText: 'Paint Night' }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /Sign me up — quick & private/ }).click();
  await page.locator('h1', { hasText: 'signed up' }).waitFor({ timeout: 5000 });
  if (i === 0) {
    check('skip path confirms without sharing needs',
      await page.getByText('didn’t share any access needs').isVisible());
  }
  await page.goto(`${BASE}/my-signups`);
  await page.getByRole('button', { name: /Simulate day passing/ }).click();
  await row('Paint Night').getByRole('button', { name: 'No', exact: true }).click();
  await row('Paint Night').getByRole('button', { name: 'Accommodation gap' }).click();
  await row('Paint Night').locator('[role="status"]', { hasText: 'now marked' }).waitFor({ timeout: 5000 });
  const status = await row('Paint Night').locator('[role="status"]', { hasText: 'now marked' }).textContent();
  const expectFlip = i === reporters.length - 1;
  check(
    `report ${i + 1}/5 -> ${expectFlip ? 'FLIPS to Barrier reported' : 'stays suppressed (Not yet verified)'}`,
    expectFlip ? status.includes('Barrier reported') : status.includes('Not yet verified'),
    status.trim(),
  );
}

const badge = await (await fetch(`http://localhost:4000/api/events/${PAINT}`)).json();
check('server persisted reported_gap on the event', badge.accessibility_badge_state === 'reported_gap');

check('no console/page errors across all flows', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 300));

await browser.close();
process.exit(failures ? 1 : 0);
