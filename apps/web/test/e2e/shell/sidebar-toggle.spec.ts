import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Sidebar show/hide', () => {
  test('should hide from the logo and show from the top-bar toggle', async ({ page }) => {
    await mockWebApi(page);

    await page.goto('/en/chat');

    const sidebar = page.getByTestId('app-sidebar');
    const hideButton = page.getByTestId('sidebar-hide');
    const showToggle = page.getByTestId('sidebar-toggle');

    await expect(sidebar).toHaveAttribute('data-visible', 'true');

    await expect(showToggle).toHaveCount(0);

    // The hide control lives on the sidebar logo and reveals on hover/focus.
    await hideButton.focus();

    await hideButton.click();

    await expect(sidebar).toHaveAttribute('data-visible', 'false');

    await expect(sidebar).toBeHidden();

    await expect(showToggle).toBeVisible();

    await expect(showToggle).toHaveAttribute('aria-label', 'Show sidebar');

    await showToggle.click();

    await expect(sidebar).toHaveAttribute('data-visible', 'true');

    await expect(sidebar).toBeVisible();

    await expect(showToggle).toHaveCount(0);
  });

  test('should remember the hidden state across a reload', async ({ page }) => {
    await mockWebApi(page);

    await page.goto('/en/chat');

    const sidebar = page.getByTestId('app-sidebar');
    const hideButton = page.getByTestId('sidebar-hide');
    const showToggle = page.getByTestId('sidebar-toggle');

    await hideButton.focus();

    await hideButton.click();

    await expect(sidebar).toHaveAttribute('data-visible', 'false');

    await page.reload();

    await expect(sidebar).toHaveAttribute('data-visible', 'false');

    await expect(showToggle).toBeVisible();
  });
});
