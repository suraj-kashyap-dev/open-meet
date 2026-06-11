import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin meetings page', () => {
  test('should list meetings from the API', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/meetings');

    await expect(page.getByRole('heading', { name: 'Meetings', exact: true })).toBeVisible();

    await expect(page.getByText('Quarterly review')).toBeVisible();

    await expect(page.getByText('Ada Lovelace')).toBeVisible();
  });

  test('should show the empty state when there are no meetings', async ({ page }) => {
    await mockAdminApi(page, { meetings: { items: [] } });

    await page.goto('/en/meetings');

    await expect(page.getByText('No meetings recorded yet.')).toBeVisible();
  });

  test('should filter by status with a select', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/meetings');

    const statusFilter = page.getByRole('combobox').filter({ hasText: 'Status' });

    await expect(statusFilter).toBeVisible();

    await statusFilter.click();

    await expect(page.getByRole('option', { name: 'Active' })).toBeVisible();

    await expect(page.getByRole('option', { name: 'Ended' })).toBeVisible();
  });

  test('should open the detail dialog from the View action', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/meetings');

    await page
      .getByRole('row', { name: /Quarterly review/ })
      .getByRole('button', { name: 'View' })
      .click();

    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();

    await expect(dialog.getByText('abcd-efgh-ijkl')).toBeVisible();
  });

  test('should force-end a meeting via the End meeting action', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/meetings');

    await page
      .getByRole('row', { name: /Quarterly review/ })
      .getByRole('button', { name: 'End meeting' })
      .click();

    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => /\/admin\/meetings\/m-1\/end$/.test(req.url()) && req.method() === 'POST',
      ),
      dialog.getByRole('button', { name: 'End meeting' }).click(),
    ]);

    expect(request.url()).toContain('/admin/meetings/m-1/end');
  });

  test('should require confirmation before deleting a meeting', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/meetings');

    await page
      .getByRole('row', { name: /Quarterly review/ })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();

    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('abcd-efgh-ijkl').fill('abcd-efgh-ijkl');

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => /\/admin\/meetings\/m-1$/.test(req.url()) && req.method() === 'DELETE',
      ),
      dialog.getByRole('button', { name: 'Delete forever' }).click(),
    ]);

    expect(request.url()).toContain('/admin/meetings/m-1');
  });

  test('should end all active meetings via the bulk action', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/meetings');

    await page.getByRole('checkbox', { name: 'Select row' }).first().check();

    await page.getByRole('button', { name: 'End all active' }).click();

    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => /\/admin\/meetings\/end-all-active$/.test(req.url()) && req.method() === 'POST',
      ),
      dialog.getByRole('button', { name: 'End all active' }).click(),
    ]);

    expect(request.url()).toContain('/admin/meetings/end-all-active');
  });
});
