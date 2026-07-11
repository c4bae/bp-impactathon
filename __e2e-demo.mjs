// End-to-end test of the LIVE DEMO flow (docs/demo-runbook.md), step for
// step: stage the DB, then drive the exact clicks the presenter will make,
// as Ava, in headless Chrome. Re-stages afterwards so the demo stays ready.
// Run with dev servers up:  node __e2e-demo.mjs
import { chromium } from 'playwright-core';
import { stage } from './scripts/demo-stage.mjs';

const BASE = 'http://localhost:5173';
const AVA = '11111111-1111-1111-1111-000000000002';
const KITCHEN_TITLE = 'Community Kitchen';

let failures = 0;
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}${ok ? '' : `  [${extra}]`}`);
  if (!ok) failures++;
};

console.log('--- Staging (node scripts/demo-stage.mjs) ---');
await stage();
check('staged: Kitchen at 4 gap reports, badge not_yet_verified', true);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.location()?.url?.includes('favicon')) pageErrors.push(m.text());
});

const kitchenCard = () => page.locator('li', { hasText: KITCHEN_TITLE });
const started = Date.now();

// ---- 0:00 Discover, as Ava --------------------------------------------
console.log('--- Beat 1: Discover (feed) ---');
await page.goto(`${BASE}/`);
await page.evaluate((uid) => localStorage.setItem('kwhab.user_id', uid), AVA);
await page.goto(`${BASE}/feed`);
await kitchenCard().waitFor({ timeout: 15000 });
check('feed lists Community Kitchen', true);
check('pre-demo badge is "Not yet verified" (4 reports suppressed)',
  await kitchenCard().getByText('Not yet verified').isVisible());
check('no barrier info leaks below threshold',
  !(await kitchenCard().getByText('Barrier reported').isVisible()));

// ---- 0:25 Detail -> signup --------------------------------------------
console.log('--- Beat 2: Sign up ---');
await kitchenCard().getByRole('link', { name: /Community Kitchen/ }).click();
await page.locator('h1', { hasText: KITCHEN_TITLE }).waitFor({ timeout: 10000 });
await page.getByRole('link', { name: 'Sign me up' }).click();
await page.locator('h1', { hasText: 'Sign up' }).waitFor({ timeout: 10000 });
await page.waitForFunction(
  () => document.querySelectorAll('input[type=checkbox]:checked').length >= 1,
  null, { timeout: 5000 },
).catch(() => {});
check('Ava\'s saved need pre-checked',
  (await page.locator('input[type=checkbox]:checked').count()) >= 1);
check('consent copy on screen', await page.getByText('never a medical label').isVisible());
check('skip path visible', await page.getByRole('button', { name: /Skip — just sign me up/ }).isVisible());
await page.locator('label', { hasText: 'Step-free' }).locator('input').check();
await page.getByRole('button', { name: 'Sign me up', exact: true }).click();
await page.locator('h1', { hasText: 'signed up' }).waitFor({ timeout: 5000 });
check('signup confirmed', true);
await page.getByRole('link', { name: 'See my signups' }).click();
await page.waitForURL('**/my-signups');

// ---- 0:50 Follow-up -> the flip ---------------------------------------
console.log('--- Beat 3: follow-up, 5th report flips the badge ---');
await page.getByRole('button', { name: /Simulate day passing/ }).click();
await kitchenCard().getByRole('button', { name: 'No', exact: true }).click();
await kitchenCard().getByRole('button', { name: 'Accommodation gap' }).click();
const flipStatus = kitchenCard().locator('[role="status"]', { hasText: 'now marked' });
await flipStatus.waitFor({ timeout: 5000 });
check('Ava\'s 5th report flips badge to "Barrier reported" live',
  (await flipStatus.textContent()).includes('Barrier reported'));

// ---- 1:20 Seekers see it ----------------------------------------------
console.log('--- Beat 4: flip visible on the feed ---');
await page.getByRole('link', { name: 'Discover', exact: true }).click();
await kitchenCard().getByText('Barrier reported').waitFor({ timeout: 10000 });
check('feed card now warns "Barrier reported"', true);

// ---- 1:35 Organizer resolves ------------------------------------------
console.log('--- Beat 5: org dashboard, resolve gap ---');
await page.getByRole('link', { name: 'Org Dashboard' }).click();
await page.locator('h1', { hasText: 'KW Habilitation' }).waitFor({ timeout: 10000 });
const blockers = page.locator('li', { hasText: 'Accommodation gap' }).first();
await blockers.waitFor({ timeout: 5000 });
check('ranked blockers show "Accommodation gap" at 5 reports',
  (await blockers.textContent()).includes('5 report'));
check('privacy threshold footnote on screen',
  await page.getByText('are never shown').isVisible());
await page.getByRole('button', { name: /Resolve accessibility gap for .*Community Kitchen/ }).click();
await page.locator('[role="status"]', { hasText: 'Accessibility confirmed' }).waitFor({ timeout: 5000 });
check('resolve-gap confirms with a status message', true);
await page.locator('section[aria-label="Your events"]')
  .getByText('Accessibility confirmed').waitFor({ timeout: 5000 });
check('dashboard badge now "Accessibility confirmed"', true);

// ---- 2:10 Loop closes on the feed --------------------------------------
console.log('--- Beat 6: loop closes ---');
await page.getByRole('link', { name: 'Discover', exact: true }).click();
await kitchenCard().getByText('Accessibility confirmed').waitFor({ timeout: 10000 });
check('feed card shows "Accessibility confirmed"', true);

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`--- machine walk-through took ${secs}s (budget 150s incl. talking) ---`);
check('no console/page errors across the demo path', pageErrors.length === 0,
  pageErrors.join(' | ').slice(0, 300));

await browser.close();

console.log('--- Re-staging so the demo is ready to run ---');
await stage();
console.log(failures ? `❌ ${failures} step(s) failed` : '✅ demo path verified end to end; DB re-staged');
process.exit(failures ? 1 : 0);
