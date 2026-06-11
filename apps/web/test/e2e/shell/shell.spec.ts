import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web app shell', () => {
  test('should redirect the authenticated root to chat', async ({ page }) => {
    await mockWebApi(page);

    await page.goto('/en');

    await expect(page).toHaveURL(/\/en\/chat$/);
  });

  test('should render the chatgpt-style sidebar with every section', async ({ page }) => {
    await mockWebApi(page);

    await page.goto('/en/chat');

    const sidebar = page.getByTestId('app-sidebar');

    await expect(sidebar).toBeVisible();

    for (const name of ['Chat', 'Meet', 'Activity', 'Starred', 'History']) {
      await expect(sidebar.getByRole('link', { name, exact: true })).toBeVisible();
    }
  });

  test('should navigate to the meet surface from the sidebar', async ({ page }) => {
    await mockWebApi(page);

    await page.goto('/en/chat');

    await page.getByTestId('app-sidebar').getByRole('link', { name: 'Meet', exact: true }).click();

    await expect(page).toHaveURL(/\/en\/meet$/);

    await expect(
      page.getByRole('heading', { name: 'Start a new meeting', exact: true }),
    ).toBeVisible();
  });

  test('should open the command palette from the top-bar search', async ({ page }) => {
    await mockWebApi(page);

    await page.goto('/en/chat');

    await page.getByRole('button', { name: 'Search' }).click();

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByRole('heading', { name: 'Search', exact: true })).toBeVisible();

    await expect(dialog.getByPlaceholder('Type a command or meeting code…')).toBeVisible();

    await expect(dialog.getByText('New meeting')).toBeVisible();

    await expect(dialog.getByText('Schedule a meeting')).toBeVisible();

    await expect(dialog.getByText('New chat')).toBeVisible();
  });

  test('should surface chat and meeting results inside the command palette', async ({ page }) => {
    await mockWebApi(page);

    await page.goto('/en/chat');

    await page.getByRole('button', { name: 'Search' }).click();

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('Grace Hopper')).toBeVisible();

    await expect(dialog.getByText('Quarterly review')).toBeVisible();
  });
});
