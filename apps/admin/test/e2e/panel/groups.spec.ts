import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin groups page', () => {
  test('should list groups from the API', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/groups');

    await expect(page.getByRole('heading', { name: 'Groups', exact: true })).toBeVisible();
    await expect(page.getByText('Product launch')).toBeVisible();
    await expect(page.getByText('Design crit')).toBeVisible();
  });

  test('should show the empty state when there are no groups', async ({ page }) => {
    await mockAdminApi(page, { groups: { items: [] } });
    await page.goto('/en/groups');

    await expect(page.getByText('No groups yet.')).toBeVisible();
  });

  test('should open the create-group form when New group is clicked', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/groups');

    await page.getByRole('button', { name: 'New group' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Create group')).toBeVisible();
    await expect(dialog.getByLabel('Group name')).toBeVisible();
    await expect(dialog.getByText('Choose members')).toBeVisible();
  });

  test('should keep the dialog open after picking a member (inline picker)', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/groups');

    await page.getByRole('button', { name: 'New group' }).click();

    const dialog = page.getByRole('dialog');
    
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('Search users').click();

    await dialog.getByRole('button', { name: /Ada Lovelace/ }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Create group')).toBeVisible();

    await dialog.getByRole('button', { name: /Alan Turing/ }).click();
    await expect(dialog).toBeVisible();
  });

  test('should submit a new group with the chosen members', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/groups');

    await page.getByRole('button', { name: 'New group' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Group name').fill('Roadmap sync');
    await dialog.getByPlaceholder('Search users').click();
    await dialog.getByRole('button', { name: /Ada Lovelace/ }).click();
    await dialog.getByLabel('Group name').click();

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().endsWith('/admin/groups') && req.method() === 'POST'),
      dialog.getByRole('button', { name: 'Create' }).click(),
    ]);

    const body = request.postDataJSON();
    expect(body).toMatchObject({ title: 'Roadmap sync' });
    expect(body.memberIds).toContain('u-1');
  });

  test('should open the edit dialog for a group', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/groups');

    await page
      .getByRole('row', { name: /Product launch/ })
      .getByRole('button', { name: 'Manage members' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Product launch' })).toBeVisible();
    await expect(dialog.getByLabel('Group name')).toHaveValue('Product launch');
  });

  test('should ask for confirmation before deleting a group', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/groups');

    await page
      .getByRole('row', { name: /Product launch/ })
      .getByRole('button', { name: 'Delete group' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Delete group?')).toBeVisible();

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => /\/admin\/groups\/g-1$/.test(req.url()) && req.method() === 'DELETE',
      ),
      dialog.getByRole('button', { name: 'Delete group' }).click(),
    ]);

    expect(request.url()).toContain('/admin/groups/g-1');
  });
});
