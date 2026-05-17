import { expect, test } from '@playwright/test';

import { registerNewUser } from './helpers/auth';
import { installMockApi } from './helpers/mock-api';

test.describe('account navigation — header dropdown + sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await installMockApi(page);
  });

  test('dropdown surfaces user identity + Profile / History / Sign out', async ({ page }) => {
    const user = await registerNewUser(page, 'Ada Lovelace');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.locator('header').getByRole('button').last().click();

    // Identity header card: name + email both rendered inside the menu.
    const menu = page.getByRole('menu');
    await expect(menu.getByText(user.name)).toBeVisible();
    await expect(menu.getByText(user.email)).toBeVisible();

    // Action items: Profile + Settings + Sign out (Meeting history lives in the sidebar only).
    await expect(page.getByRole('menuitem', { name: /^Profile/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /^Settings/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Meeting history/ })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /Sign out/ })).toBeVisible();
  });

  test('Profile menu item navigates to /profile', async ({ page }) => {
    await registerNewUser(page, 'Ada');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.locator('header').getByRole('button').last().click();
    await expect(page.getByRole('menuitem', { name: /^Profile/ })).toBeVisible();
    await page.getByRole('menuitem', { name: /^Profile/ }).click();

    await expect(page).toHaveURL(/\/profile$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible();
  });

  test('Meeting history is reachable from the sidebar', async ({ page }) => {
    await registerNewUser(page, 'Ada');

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.getByRole('link', { name: /Meeting history/ }).click();

    await expect(page).toHaveURL(/\/history$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Meeting history' })).toBeVisible();
  });

  test('sidebar highlights the active route', async ({ page }) => {
    await registerNewUser(page, 'Ada');

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    const profileLink = page.getByRole('link', { name: /Profile/ });
    const historyLink = page.getByRole('link', { name: /Meeting history/ });

    // Active route gets a text-accent class — easiest way to assert "active" is
    // by checking the class list on the link.
    await expect(profileLink).toHaveClass(/text-accent/);
    await expect(historyLink).not.toHaveClass(/text-accent/);

    await historyLink.click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(historyLink).toHaveClass(/text-accent/);
    await expect(profileLink).not.toHaveClass(/text-accent/);
  });

  test('sidebar is NOT present on the dashboard', async ({ page }) => {
    await registerNewUser(page, 'Ada');

    await page.goto('/');
    await page.locator('html[data-hydrated="true"]').waitFor();

    // The account sidebar nav owns the "Account" eyebrow + Profile / Settings /
    // Meeting history items. Footer links also use the word "Account" so we
    // anchor on the nav element specifically.
    await expect(page.locator('nav').filter({ hasText: 'Account' })).toHaveCount(0);
  });
});
