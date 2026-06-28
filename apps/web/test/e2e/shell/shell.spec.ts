import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web app shell', () => {
  const openCommandPalette = async (page: Page) => {
    await page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code: 'KeyK',
          ctrlKey: true,
          key: 'k',
        }),
      );
    });
  };

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

  test('should show bottom navigation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await mockWebApi(page);

    await page.goto('/en/chat');

    const bottomNav = page.getByTestId('mobile-bottom-nav');

    await expect(bottomNav).toBeVisible();

    await expect(page.getByTestId('sidebar-toggle')).toHaveCount(0);

    for (const name of ['Chat', 'Meet', 'Activity', 'Starred', 'History']) {
      await expect(bottomNav.getByRole('link', { name, exact: true })).toBeVisible();
    }

    await bottomNav.getByRole('link', { name: 'Meet', exact: true }).click();

    await expect(page).toHaveURL(/\/en\/meet$/);

    await expect(
      page.getByRole('heading', { name: 'Start a new meeting', exact: true }),
    ).toBeVisible();
  });

  test('should open the command palette with the keyboard shortcut', async ({ page }) => {
    await mockWebApi(page);

    await page.goto('/en/chat');

    await expect(page.getByTestId('app-sidebar')).toBeVisible();

    await openCommandPalette(page);

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

    await expect(page.getByTestId('app-sidebar')).toBeVisible();

    await openCommandPalette(page);

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('Grace Hopper')).toBeVisible();

    await expect(dialog.getByText('Quarterly review')).toBeVisible();
  });
});
