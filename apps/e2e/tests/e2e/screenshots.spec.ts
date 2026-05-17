import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { installMockApi, type MockState } from './helpers/mock-api';

const OUT_DIR = path.resolve(__dirname, '../../../../docs/screenshots');
const VIEWPORT = { width: 1440, height: 900 };

test.describe.configure({ mode: 'serial' });

test.use({
  viewport: VIEWPORT,
  colorScheme: 'light',
});

test.beforeAll(async () => {
  await mkdir(OUT_DIR, { recursive: true });
});

async function forceLightTheme(page: Page): Promise<void> {
  // next-themes reads localStorage["theme"] on boot. Set it before any app
  // script runs so the document never paints in dark mode.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('theme', 'light');
    } catch {
      /* ignore */
    }
  });
}

async function captureFullPage(page: Page, file: string): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
  });

  // Give animations a moment to settle.
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(OUT_DIR, file),
    fullPage: false,
    animations: 'disabled',
    type: 'png',
  });
}

async function bootMocks(page: Page): Promise<MockState> {
  await forceLightTheme(page);
  return installMockApi(page);
}

test('01 — sign in page', async ({ page }) => {
  await bootMocks(page);

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

  await captureFullPage(page, '01-login.png');
});

test('02 — sign up page', async ({ page }) => {
  await bootMocks(page);

  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

  await captureFullPage(page, '02-register.png');
});

test('03 — dashboard', async ({ page }) => {
  const state = await bootMocks(page);
  state.seedUser({ name: 'Ada Lovelace', email: 'ada@example.com' });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 10_000 });

  await expect(
    page
      .getByRole('heading', { level: 1 })
      .filter({ hasText: /(morning|afternoon|evening|up late)/i }),
  ).toBeVisible({ timeout: 15_000 });

  await expect(page.getByRole('button', { name: /new meeting/i })).toBeEnabled();

  await captureFullPage(page, '03-dashboard.png');
});

test('04 — lobby', async ({ page, context }) => {
  const state = await bootMocks(page);
  state.seedUser({ name: 'Ada Lovelace', email: 'ada@example.com' });
  await context.grantPermissions(['camera', 'microphone']);

  await page.goto('/sample-abcd-efgh/lobby', { waitUntil: 'domcontentloaded' });
  await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 10_000 });

  await expect(page.getByRole('button', { name: /join now/i }).first()).toBeVisible({
    timeout: 15_000,
  });

  // Chromium's fake camera renders a green test pattern — switch the camera
  // off so the preview shows the user's avatar in its clean dark backdrop.
  const cameraOffButton = page.getByRole('button', { name: /turn off camera/i }).first();
  if (await cameraOffButton.isVisible().catch(() => false)) {
    await cameraOffButton.click();
  }

  await page.waitForTimeout(500);

  await captureFullPage(page, '04-lobby.png');
});

// In-call captures: the mock LiveKit URL never finishes connecting, but the
// meeting shell mounts immediately and renders the top bar + controls + an
// empty video grid placeholder — which is what the README is showcasing.
async function gotoMeeting(page: Page): Promise<void> {
  await page.goto('/sample-meet-roomx', { waitUntil: 'domcontentloaded' });
  await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 10_000 });

  // Wait for the in-call footer Leave button to appear — proves MeetingShell
  // has mounted. The mock LK URL points at a non-routable address so the WS
  // connection sits pending instead of failing fast, which keeps the shell on
  // screen instead of flipping to the EndedView.
  await page.getByRole('button', { name: /^leave$/i }).first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(300);
}

test('05 — meeting room', async ({ page, context }) => {
  const state = await bootMocks(page);
  state.seedUser({ name: 'Ada Lovelace', email: 'ada@example.com' });
  await context.grantPermissions(['camera', 'microphone']);

  await gotoMeeting(page);
  await captureFullPage(page, '05-meeting.png');
});

test('06 — participants panel', async ({ page, context }) => {
  const state = await bootMocks(page);
  state.seedUser({ name: 'Ada Lovelace', email: 'ada@example.com' });
  await context.grantPermissions(['camera', 'microphone']);

  await gotoMeeting(page);

  const participantsButton = page.getByRole('button', { name: /participants/i }).first();
  if (await participantsButton.isVisible().catch(() => false)) {
    await participantsButton.click();
    await page.waitForTimeout(600);
  }

  await captureFullPage(page, '06-participants.png');
});

test('07 — chat panel', async ({ page, context }) => {
  const state = await bootMocks(page);
  state.seedUser({ name: 'Ada Lovelace', email: 'ada@example.com' });
  await context.grantPermissions(['camera', 'microphone']);

  await gotoMeeting(page);

  const chatButton = page.getByRole('button', { name: /^chat$/i }).first();
  if (await chatButton.isVisible().catch(() => false)) {
    await chatButton.click();
    await page.waitForTimeout(600);
  }

  await captureFullPage(page, '07-chat.png');
});
