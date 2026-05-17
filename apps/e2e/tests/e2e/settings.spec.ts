import { expect, test } from '@playwright/test';

import { registerNewUser } from './helpers/auth';

const fullStack = !! process.env.RUN_FULL_E2E;

test.describe('user settings', () => {
  test.skip(! fullStack, 'requires API stack — set RUN_FULL_E2E=1');

  test('settings page is reachable from the sidebar', async ({ page }) => {
    await registerNewUser(page);

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.getByRole('link', { name: /Settings/ }).first().click();
    await page.waitForURL(/\/settings$/);

    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  });

  test('toggling a meeting preference persists across reload', async ({ page }) => {
    await registerNewUser(page);

    await page.goto('/settings');
    await page.locator('html[data-hydrated="true"]').waitFor();

    const row = page
      .getByText('Join muted by default')
      .locator('xpath=ancestor::div[1]');
    const toggle = row.getByRole('switch');

    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    const form = toggle.locator('xpath=ancestor::form[1]');

    await form.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText('Meeting preferences updated')).toBeVisible({
      timeout: 10_000,
    });

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    const reloaded = page
      .getByText('Join muted by default')
      .locator('xpath=ancestor::div[1]')
      .getByRole('switch');

    await expect(reloaded).toHaveAttribute('aria-checked', 'true');
  });

  test('toggling a privacy setting persists across reload', async ({ page }) => {
    await registerNewUser(page);

    await page.goto('/settings');
    await page.locator('html[data-hydrated="true"]').waitFor();

    const row = page
      .getByText('Allow direct messages')
      .locator('xpath=ancestor::div[1]');
    const toggle = row.getByRole('switch');

    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    const form = toggle.locator('xpath=ancestor::form[1]');

    await form.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText('Privacy settings updated')).toBeVisible({
      timeout: 10_000,
    });

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    const reloaded = page
      .getByText('Allow direct messages')
      .locator('xpath=ancestor::div[1]')
      .getByRole('switch');

    await expect(reloaded).toHaveAttribute('aria-checked', 'false');
  });

  test('profile page no longer surfaces settings sections', async ({ page }) => {
    await registerNewUser(page);

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(page.getByText('Join muted by default')).toHaveCount(0);
    await expect(page.getByText('Allow direct messages')).toHaveCount(0);
    await expect(page.getByText('Timezone')).toHaveCount(0);
  });
});
