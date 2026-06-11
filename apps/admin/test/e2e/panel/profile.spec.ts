import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';
import { currentAdmin } from '../fixtures/data';

test.describe('Admin profile page', () => {
  test('should render the profile, account, and password sections', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/profile');

    await expect(page.getByRole('heading', { name: 'My profile', exact: true })).toBeVisible();

    await expect(page.getByLabel('Name')).toHaveValue(currentAdmin.name);

    await expect(page.getByLabel('Email')).toHaveValue(currentAdmin.email);

    await expect(page.getByLabel('Email')).toBeDisabled();

    await expect(page.getByRole('heading', { name: 'Password', exact: true })).toBeVisible();

    await expect(page.getByLabel('Current password')).toBeVisible();
  });

  test('should expose a profile link in the topbar account menu', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en');

    const trigger = page.getByRole('button', { name: currentAdmin.name });

    await expect(trigger).toBeVisible();

    await trigger.click();

    const item = page.getByRole('menuitem', { name: 'My profile' });

    await expect(item).toBeVisible();

    await expect(item).toHaveAttribute('href', /\/en\/profile$/);
  });
});
