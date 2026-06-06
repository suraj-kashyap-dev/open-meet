import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin users page', () => {
  test('should list users from the API', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/users');

    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
    await expect(page.getByText('ada@example.com')).toBeVisible();
    await expect(page.getByText('Alan Turing')).toBeVisible();
  });

  test('should show the empty state when there are no users', async ({ page }) => {
    await mockAdminApi(page, { users: { items: [], total: 0, page: 1, pageSize: 20 } });
    await page.goto('/en/users');

    await expect(page.getByText('No users yet.')).toBeVisible();
  });

  test('should open the invite form when Invite user is clicked', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/users');

    await page.getByRole('button', { name: 'Invite user' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Invite a user')).toBeVisible();
    await expect(dialog.getByLabel('Name')).toBeVisible();
    await expect(dialog.getByLabel('Email')).toBeVisible();
  });

  test('should submit the invite to the invite endpoint', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/users');

    await page.getByRole('button', { name: 'Invite user' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill('Nina Newbie');
    await dialog.getByLabel('Email').fill('newbie@example.com');

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().endsWith('/admin/users/invite') && req.method() === 'POST',
      ),
      dialog.getByRole('button', { name: 'Send invite' }).click(),
    ]);

    expect(request.postDataJSON()).toMatchObject({
      name: 'Nina Newbie',
      email: 'newbie@example.com',
    });
  });

  test('should open the create form when New user is clicked', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/users');

    await page.getByRole('button', { name: 'New user' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Create a user')).toBeVisible();
    await expect(dialog.getByLabel('Name')).toBeVisible();
    await expect(dialog.getByLabel('Email')).toBeVisible();
    await expect(dialog.getByLabel('Password')).toBeVisible();
  });

  test('should submit a new user to the create endpoint', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/users');

    await page.getByRole('button', { name: 'New user' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill('Grace Hopper');
    await dialog.getByLabel('Email').fill('grace@example.com');
    await dialog.getByLabel('Password').fill('supersecret');

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().endsWith('/admin/users') && req.method() === 'POST'),
      dialog.getByRole('button', { name: 'Create user' }).click(),
    ]);

    expect(request.postDataJSON()).toMatchObject({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'supersecret',
    });
  });

  test('should open the edit dialog when Edit is clicked', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/users');

    await page
      .getByRole('row', { name: /Ada Lovelace/ })
      .getByRole('button', { name: 'Edit' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Edit user')).toBeVisible();
    await expect(dialog.getByLabel('Name')).toHaveValue('Ada Lovelace');
    await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeVisible();
  });

  test('should save profile changes from the edit dialog via PATCH', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/users');

    await page
      .getByRole('row', { name: /Ada Lovelace/ })
      .getByRole('button', { name: 'Edit' })
      .click();

    const dialog = page.getByRole('dialog');
    const name = dialog.getByLabel('Name');
    await expect(name).toHaveValue('Ada Lovelace');
    await name.fill('Ada L.');

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes('/admin/users/u-1') && req.method() === 'PATCH',
      ),
      dialog.getByRole('button', { name: 'Save changes' }).click(),
    ]);

    expect(request.postDataJSON()).toMatchObject({ name: 'Ada L.' });
  });

  test('should list pending invitations', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/users');

    await expect(page.getByRole('heading', { name: 'Pending invitations' })).toBeVisible();
    await expect(page.getByText('newbie@example.com')).toBeVisible();
  });

  test('should toggle a user chat access via the update endpoint', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/users');

    const toggle = page
      .getByRole('row', { name: /Ada Lovelace/ })
      .getByRole('button', { name: 'Toggle chat' });
    await expect(toggle).toBeVisible();

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes('/admin/users/u-1') && req.method() === 'PATCH',
      ),
      toggle.click(),
    ]);

    expect(request.postDataJSON()).toMatchObject({ chatDisabled: true });
  });
});
