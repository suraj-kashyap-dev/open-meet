import path from 'node:path';

import { test, expect, type Page } from '@playwright/test';

import { registerNewUser } from './helpers/auth';

const CAPTURE = !! process.env.CAPTURE_SCREENSHOTS;

const VIEWPORT = { width: 1440, height: 900 } as const;

const OUT_DIR = path.resolve(__dirname, '../../../../docs/screenshots');

function shot(name: string): string {
  return path.join(OUT_DIR, `${name}.png`);
}

async function settle(page: Page, ms = 1_200): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

test.describe('docs screenshots', () => {
  test.skip(! CAPTURE, 'gated — set CAPTURE_SCREENSHOTS=1');
  test.use({ viewport: VIEWPORT });

  test('capture marketing surface', async ({ page, context }) => {
    test.setTimeout(180_000);
    await context.grantPermissions(['camera', 'microphone']);

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: shot('01-login'), fullPage: false });

    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: shot('02-register'), fullPage: false });

    await registerNewUser(page, 'Ada Lovelace');
    await expect(page.getByRole('button', { name: 'New meeting' })).toBeEnabled();
    await settle(page);
    await page.screenshot({ path: shot('03-dashboard'), fullPage: false });

    await page.getByRole('button', { name: 'New meeting' }).click();
    await page.waitForURL(/\/[a-z0-9-]{8,}\/lobby$/, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Join now' })).toBeVisible({ timeout: 15_000 });

    // Turn off the camera so the lobby renders the avatar fallback instead of
    // Chromium's fake-media test pattern — much nicer for docs.
    await page.getByRole('button', { name: /Turn off camera/i }).click().catch(() => {});
    await settle(page);
    await page.screenshot({ path: shot('04-lobby'), fullPage: false });

    const lobbyUrl = new URL(page.url());
    const code = lobbyUrl.pathname.split('/').filter(Boolean)[0]!;

    await page.getByRole('button', { name: /^Join now$/ }).first().click();
    await page.waitForURL(new RegExp(`/${code}$`), { timeout: 30_000 });
    await page.waitForTimeout(3_500);

    // Same trick: kill the camera inside the meeting so the tile shows the
    // avatar placeholder rather than the rotating green pattern.
    await page.getByRole('button', { name: /Turn off camera/i }).click().catch(() => {});
    await settle(page, 1_800);
    await page.screenshot({ path: shot('05-meeting'), fullPage: false });

    await page.getByRole('button', { name: /participants/i }).first().click().catch(() => {});
    await settle(page);
    await page.screenshot({ path: shot('06-participants'), fullPage: false });

    await page.getByRole('button', { name: /participants/i }).first().click().catch(() => {});
    await page.getByRole('button', { name: /open chat|chat/i }).first().click().catch(() => {});
    await settle(page);
    await page.screenshot({ path: shot('07-chat'), fullPage: false });
  });
});
