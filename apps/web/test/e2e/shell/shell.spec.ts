import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web app shell', () => {
  test('should redirect the authenticated root to chat', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en');

    await expect(page).toHaveURL(/\/en\/chat$/);
  });

  test('should render the icon rail with every section', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/chat');

    const rail = page.getByTestId('app-rail');
    await expect(rail).toBeVisible();
    for (const name of ['Chat', 'Meet', 'Teams', 'Activity', 'Saved', 'History']) {
      await expect(rail.getByRole('link', { name, exact: true })).toBeVisible();
    }
  });

  test('should navigate to the meet surface from the rail', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/chat');

    await page.getByTestId('app-rail').getByRole('link', { name: 'Meet', exact: true }).click();

    await expect(page).toHaveURL(/\/en\/meet$/);
    await expect(
      page.getByRole('heading', { name: 'Start a new meeting', exact: true }),
    ).toBeVisible();
  });

  test('should open the command palette from the top-bar search', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/chat');

    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByPlaceholder('Type a command or meeting code…')).toBeVisible();
  });
});
