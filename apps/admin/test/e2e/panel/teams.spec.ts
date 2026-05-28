import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin teams page', () => {
  test('should list teams from the API', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/teams');

    await expect(page.getByRole('heading', { name: 'Teams', exact: true })).toBeVisible();
    await expect(page.getByText('Engineering')).toBeVisible();
    await expect(page.getByText('Marketing')).toBeVisible();
  });

  test('should show the empty state when there are no teams', async ({ page }) => {
    await mockAdminApi(page, { teams: { items: [] } });
    await page.goto('/en/teams');

    await expect(page.getByText('No teams yet.')).toBeVisible();
  });

  test('should open the create-team form when New team is clicked', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/teams');

    await page.getByRole('button', { name: 'New team' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Create team')).toBeVisible();
    await expect(dialog.getByLabel('Team name')).toBeVisible();
  });

  test('should submit a new team to the create endpoint', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/teams');

    await page.getByRole('button', { name: 'New team' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Team name').fill('Support');

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().endsWith('/admin/teams') && req.method() === 'POST'),
      dialog.getByRole('button', { name: 'Create' }).click(),
    ]);

    expect(request.postDataJSON()).toMatchObject({ name: 'Support' });
  });

  test('should open the separate edit page for a team', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/teams');

    await page
      .getByRole('row', { name: /Engineering/ })
      .getByRole('button', { name: 'Manage members' })
      .click();

    await expect(page).toHaveURL(/\/en\/teams\/t-1$/);
    await expect(page.getByRole('heading', { name: 'Engineering', exact: true })).toBeVisible();

    // Members loaded from the mocked GET /admin/teams/:id
    await expect(page.getByText('Ada Lovelace')).toBeVisible();
    await expect(page.getByText('alan@example.com')).toBeVisible();

    // Channels section: list from mocked GET /admin/teams/:id/channels
    await expect(page.getByText('Channels')).toBeVisible();
    await expect(page.getByText('general', { exact: true })).toBeVisible();
    await expect(page.getByText('releases', { exact: true })).toBeVisible();

    // The general channel is non-deletable; the custom one exposes a delete control.
    await expect(page.getByRole('button', { name: 'Delete channel' })).toBeVisible();

    // Add-channel input is present.
    await expect(page.getByPlaceholder('New channel name')).toBeVisible();
  });

  test('should create a channel via the channels endpoint', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/teams');

    await page
      .getByRole('row', { name: /Engineering/ })
      .getByRole('button', { name: 'Manage members' })
      .click();

    await expect(page).toHaveURL(/\/en\/teams\/t-1$/);
    await page.getByPlaceholder('New channel name').fill('incidents');

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => /\/admin\/teams\/[^/]+\/channels$/.test(req.url()) && req.method() === 'POST',
      ),
      page.getByRole('button', { name: 'Add channel' }).click(),
    ]);

    expect(request.postDataJSON()).toMatchObject({ name: 'incidents' });
  });

  test('should delete a channel via the channels endpoint', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/teams');

    await page
      .getByRole('row', { name: /Engineering/ })
      .getByRole('button', { name: 'Manage members' })
      .click();

    await expect(page).toHaveURL(/\/en\/teams\/t-1$/);

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) =>
          /\/admin\/teams\/[^/]+\/channels\/[^/]+$/.test(req.url()) && req.method() === 'DELETE',
      ),
      page.getByRole('button', { name: 'Delete channel' }).click(),
    ]);

    expect(request.url()).toContain('/admin/teams/t-1/channels/c-releases');
  });
});
