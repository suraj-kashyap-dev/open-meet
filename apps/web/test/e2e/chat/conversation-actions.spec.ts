import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web chat conversation list actions', () => {
  test('should expose pin, mute, mark-unread and hide actions', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/chat');

    await page.getByRole('button', { name: 'Conversation actions' }).first().click();

    await expect(page.getByRole('menuitem', { name: 'Pin to top' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Mute' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Mark as unread' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Hide' })).toBeVisible();
  });

  test('should confirm with an undo toast when hiding a chat', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/chat');

    await page.getByRole('button', { name: 'Conversation actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Hide' }).click();

    await expect(page.getByText('Chat hidden')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  });
});
