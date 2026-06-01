import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin departments page', () => {
  test('should list departments from the API', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/departments');

    await expect(page.getByRole('heading', { name: 'Departments', exact: true })).toBeVisible();
    await expect(page.getByText('Engineering')).toBeVisible();
    await expect(page.getByText('Marketing')).toBeVisible();
  });

  test('should show the empty state when there are no departments', async ({ page }) => {
    await mockAdminApi(page, { departments: { items: [] } });
    await page.goto('/en/departments');

    await expect(page.getByText('No departments yet.')).toBeVisible();
  });

  test('should open the create-department form when New department is clicked', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/departments');

    await page.getByRole('button', { name: 'New department' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Create department')).toBeVisible();
    await expect(dialog.getByLabel('Department name')).toBeVisible();
  });

  test('should submit a new department to the create endpoint', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/departments');

    await page.getByRole('button', { name: 'New department' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Department name').fill('Support');

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().endsWith('/admin/departments') && req.method() === 'POST'),
      dialog.getByRole('button', { name: 'Create' }).click(),
    ]);

    expect(request.postDataJSON()).toMatchObject({ name: 'Support' });
  });

  test('should open the edit dialog for a department', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/departments');

    await page
      .getByRole('row', { name: /Engineering/ })
      .getByRole('button', { name: 'Manage members' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Engineering' })).toBeVisible();
    // Name prefilled from the mocked GET /admin/departments/:id
    await expect(dialog.getByLabel('Department name')).toHaveValue('Engineering');
  });

  test('should ask for confirmation before deleting a department', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/departments');

    await page
      .getByRole('row', { name: /Engineering/ })
      .getByRole('button', { name: 'Delete department' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Delete department?')).toBeVisible();

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => /\/admin\/departments\/t-1$/.test(req.url()) && req.method() === 'DELETE',
      ),
      dialog.getByRole('button', { name: 'Delete department' }).click(),
    ]);

    expect(request.url()).toContain('/admin/departments/t-1');
  });
});
