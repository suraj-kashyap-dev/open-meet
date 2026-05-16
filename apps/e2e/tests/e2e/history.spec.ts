import { expect, test } from '@playwright/test';

import { registerNewUser } from './helpers/auth';

const fullStack = !! process.env.RUN_FULL_E2E;
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

test.describe('meeting history', () => {
  test.skip(! fullStack, 'requires API stack — set RUN_FULL_E2E=1');

  test('shows empty state for a brand-new user', async ({ page }) => {
    await registerNewUser(page, 'Ada');

    await page.goto('/history', { waitUntil: 'domcontentloaded' });
    await page.locator('html[data-hydrated="true"]').waitFor();
    await page.waitForURL(/\/history$/);

    await expect(page.getByRole('heading', { name: 'Meeting history' })).toBeVisible();
    await expect(page.getByText('No meetings yet')).toBeVisible();
  });

  test('renders a created meeting in the table and opens its detail', async ({ page }) => {
    await registerNewUser(page, 'Ada');

    // Create + join a meeting so it appears in history.
    const code = await page.evaluate(async (api: string) => {
      const created = await fetch(`${api}/api/meetings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({}),
      }).then((r) => r.json());

      await fetch(`${api}/api/meetings/${created.data.code}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      return created.data.code as string;
    }, apiUrl);

    await page.goto('/history', { waitUntil: 'domcontentloaded' });
    await page.locator('html[data-hydrated="true"]').waitFor();

    // Table renders headers + at least one row for our meeting code.
    const codeCell = page.getByRole('cell').filter({ hasText: code });
    await expect(codeCell.first()).toBeVisible({ timeout: 10_000 });

    // Click the row's "Open" action to go to the detail page.
    await page.getByRole('row').filter({ hasText: code }).getByRole('link', { name: 'Open' }).click();

    await expect(page).toHaveURL(new RegExp(`/history/${code}$`), { timeout: 10_000 });

    // Sidebar remains visible on the detail view (regression).
    await expect(page.getByRole('link', { name: /Meeting history/ })).toBeVisible();
  });

  test('history list table renders expected column headers', async ({ page }) => {
    await registerNewUser(page, 'Ada');

    // Seed one meeting so the table actually renders.
    await page.evaluate(async (api: string) => {
      await fetch(`${api}/api/meetings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({}),
      });
    }, apiUrl);

    await page.goto('/history', { waitUntil: 'domcontentloaded' });
    await page.locator('html[data-hydrated="true"]').waitFor();

    for (const header of ['Meeting', 'Started', 'Duration', 'Participants', 'Activity', 'Status']) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });
});
