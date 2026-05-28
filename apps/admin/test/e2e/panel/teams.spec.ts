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

  test('should show members and the channels section when managing a team', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/teams');

    await page
      .getByRole('row', { name: /Engineering/ })
      .getByRole('button', { name: 'Manage members' })
      .click();

    const dialog = page.getByRole('dialog');

    // Members loaded from the mocked GET /admin/teams/:id
    await expect(dialog.getByText('Ada Lovelace')).toBeVisible();
    await expect(dialog.getByText('alan@example.com')).toBeVisible();

    // Channels section: list from mocked GET /admin/teams/:id/channels
    await expect(dialog.getByText('Channels')).toBeVisible();
    await expect(dialog.getByText('general', { exact: true })).toBeVisible();
    await expect(dialog.getByText('releases', { exact: true })).toBeVisible();

    // The general channel is non-deletable; the custom one exposes a delete control.
    await expect(dialog.getByRole('button', { name: 'Delete channel' })).toBeVisible();

    // Add-channel input is present.
    await expect(dialog.getByPlaceholder('New channel name')).toBeVisible();
  });

  test('should create a channel via the channels endpoint', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/teams');

    await page
      .getByRole('row', { name: /Engineering/ })
      .getByRole('button', { name: 'Manage members' })
      .click();

    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('New channel name').fill('incidents');

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => /\/admin\/teams\/[^/]+\/channels$/.test(req.url()) && req.method() === 'POST',
      ),
      dialog.getByRole('button', { name: 'Add channel' }).click(),
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

    const dialog = page.getByRole('dialog');

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) =>
          /\/admin\/teams\/[^/]+\/channels\/[^/]+$/.test(req.url()) && req.method() === 'DELETE',
      ),
      dialog.getByRole('button', { name: 'Delete channel' }).click(),
    ]);

    expect(request.url()).toContain('/admin/teams/t-1/channels/c-releases');
  });
});
