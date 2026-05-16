import { expect, test, type Page } from '@playwright/test';

import { registerNewUser } from './helpers/auth';

const fullStack = !! process.env.RUN_FULL_E2E;

/**
 * The profile page renders several settings sections; each one has its own
 * Reset / Save changes buttons. Scope queries to the Personal details form so
 * we don't trip over strict-mode duplicates.
 */
function personalForm(page: Page) {
  return page.getByLabel('Display name').locator('xpath=ancestor::form[1]');
}

test.describe('profile page', () => {
  test.skip(! fullStack, 'requires API stack — set RUN_FULL_E2E=1');

  test('renders current name, email, and sidebar', async ({ page }) => {
    const user = await registerNewUser(page, 'Ada Lovelace');

    await page.goto('/profile');
    await page.waitForURL(/\/profile$/);

    await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Display name')).toHaveValue(user.name);
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(user.email);
    await expect(page.getByLabel('Email', { exact: true })).toBeDisabled();

    // Sidebar with Profile + Meeting history links is present.
    await expect(page.getByRole('link', { name: /Profile/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Meeting history/ })).toBeVisible();
  });

  test('blocks save with an empty name', async ({ page }) => {
    await registerNewUser(page, 'Ada');

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.getByLabel('Display name').fill('  ');
    await personalForm(page).getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText('Name is required')).toBeVisible();
  });

  test('saves a new name and updates the header avatar', async ({ page }) => {
    await registerNewUser(page, 'Ada Lovelace');

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.getByLabel('Display name').fill('Grace Hopper');
    await personalForm(page).getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText('Profile updated')).toBeVisible({ timeout: 10_000 });

    // Header trigger displays the new name on desktop widths.
    await expect(page.locator('header').getByText('Grace Hopper')).toBeVisible();

    // /auth/me round-trip persists the change after a reload.
    await page.reload();
    await expect(page.getByLabel('Display name')).toHaveValue('Grace Hopper');
  });

  test('reset button restores the original value', async ({ page }) => {
    const user = await registerNewUser(page, 'Ada Lovelace');

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.getByLabel('Display name').fill('Something Else');
    await personalForm(page).getByRole('button', { name: 'Reset' }).click();

    await expect(page.getByLabel('Display name')).toHaveValue(user.name);
    // Save should be disabled again because nothing is dirty.
    await expect(
      personalForm(page).getByRole('button', { name: /save changes/i }),
    ).toBeDisabled();
  });
});
