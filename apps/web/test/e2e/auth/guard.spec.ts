import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

const PROTECTED_ROUTES = ['/en', '/en/profile', '/en/settings', '/en/history'];

test.describe('Web auth guard', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`should redirect an unauthenticated visitor from ${route} to login`, async ({ page }) => {
      await mockWebApi(page, { me: null });
      await page.goto(route);

      await expect(page).toHaveURL(/\/en\/login/);
    });
  }

  test('should redirect an authenticated visitor away from the login page', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/login');

    await expect(page).toHaveURL(/\/en$/);
  });
});
