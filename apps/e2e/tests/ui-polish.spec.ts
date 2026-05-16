import { expect, test } from '@playwright/test';

test.describe('UI polish — landing, theme, palette', () => {
  test('theme toggle flips html class on the landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect.poll(() => page.evaluate(() => document.documentElement.className)).toMatch(
      /dark|light/,
    );

    const before = await page.evaluate(() => document.documentElement.className);

    await page
      .locator('header')
      .getByRole('button', { name: /switch to (light|dark) theme/i })
      .click();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.className))
      .not.toBe(before);
  });

  test('landing renders features, steps, stats, footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /remote team actually needs/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /signed-out to face-to-face/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /way your team actually works/i })).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('footer').getByText(/MIT licensed/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('hero CTA links go to the right places', async ({ page }) => {
    await page.goto('/');

    const startFree = page.locator('main').getByRole('link', { name: /start free/i }).first();

    await expect(startFree).toHaveAttribute('href', '/register');
  });
});
