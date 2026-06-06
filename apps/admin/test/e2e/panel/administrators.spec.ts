import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin administrators page', () => {
  test('should list administrator accounts', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/administrators');

    await expect(page.getByRole('heading', { name: 'Administrators', exact: true })).toBeVisible();
    await expect(page.getByText('Ada Lovelace')).toBeVisible();
    await expect(page.getByText('ada@example.com')).toBeVisible();
    await expect(page.getByText('Bob Admin')).toBeVisible();
    await expect(page.getByText('bob@example.com')).toBeVisible();
  });

  test('should show the empty state when there are no administrators', async ({ page }) => {
    await mockAdminApi(page, { accounts: { items: [] } });
    await page.goto('/en/administrators');

    await expect(page.getByText('No administrators yet.')).toBeVisible();
  });

  test('should open the invite dialog from the toolbar', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/administrators');

    await page.getByRole('button', { name: 'Invite admin' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Invite an admin' })).toBeVisible();
    await expect(dialog.getByLabel('Email')).toBeVisible();
  });

  test('should open the edit dialog from a row', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/administrators');

    await page
      .getByRole('row', { name: /Ada Lovelace/ })
      .getByRole('button', { name: 'Edit' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Edit admin' })).toBeVisible();
    await expect(dialog.getByLabel('Name')).toHaveValue('Ada Lovelace');
  });

  test('should ask for confirmation and call the API before deleting an admin', async ({
    page,
  }) => {
    await mockAdminApi(page);
    await page.goto('/en/administrators');

    await page
      .getByRole('row', { name: /Ada Lovelace/ })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Delete this admin?')).toBeVisible();

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => /\/admin\/accounts\/a-1$/.test(req.url()) && req.method() === 'DELETE',
      ),
      dialog.getByRole('button', { name: 'Delete admin' }).click(),
    ]);

    expect(request.url()).toContain('/admin/accounts/a-1');
  });
});
