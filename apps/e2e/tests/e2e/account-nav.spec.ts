import { expect, test } from '@playwright/test';

import { registerNewUser } from './helpers/auth';

const fullStack = !! process.env.RUN_FULL_E2E;

test.describe('account navigation — header dropdown + sidebar', () => {
  test.skip(! fullStack, 'requires API stack — set RUN_FULL_E2E=1');

  test('dropdown surfaces user identity + Profile / History / Sign out', async ({ page }) => {
    const user = await registerNewUser(page, 'Ada Lovelace');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.locator('header').getByRole('button').last().click();

    // Identity header card: name + email both rendered inside the menu.
    const menu = page.getByRole('menu');
    await expect(menu.getByText(user.name)).toBeVisible();
    await expect(menu.getByText(user.email)).toBeVisible();

    // Action items
    await expect(page.getByRole('menuitem', { name: /^Profile/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Meeting history/ })).toBeVisible();
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

  test('Meeting history menu item navigates to /history', async ({ page }) => {
    await registerNewUser(page, 'Ada');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.locator('header').getByRole('button').last().click();
    await expect(page.getByRole('menuitem', { name: /Meeting history/ })).toBeVisible();
    await page.getByRole('menuitem', { name: /Meeting history/ }).click();

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

    await page.goto('/app');
    await page.locator('html[data-hydrated="true"]').waitFor();

    // No sidebar with "Account" section header on /app.
    await expect(page.getByText('Account', { exact: true })).toHaveCount(0);
  });
});
