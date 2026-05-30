import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

const PANEL_ROUTES = [
  '/en',
  '/en/users',
  '/en/meetings',
  '/en/teams',
  '/en/administrators',
  '/en/settings/configuration',
  '/en/settings/branding',
];

test.describe('Admin auth guard', () => {
  for (const route of PANEL_ROUTES) {
    test(`should redirect an unauthenticated visitor from ${route} to login`, async ({ page }) => {
      await mockAdminApi(page, { me: null });
      await page.goto(route);

      await expect(page).toHaveURL(/\/en\/login$/);
    });
  }

  test('should redirect an authenticated admin away from the login page', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/login');

    await expect(page).toHaveURL(/\/en$/);
  });

  test('should keep an unauthenticated visitor on the login page', async ({ page }) => {
    await mockAdminApi(page, { me: null });
    await page.goto('/en/login');

    await expect(page).toHaveURL(/\/en\/login$/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
