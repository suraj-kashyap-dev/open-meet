import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web new chat (inline "To:" composer)', () => {
  test('should compose a new chat and land on the conversation after sending', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/chat');

    await page.getByRole('button', { name: 'New chat' }).click();
    await page.getByRole('menuitem', { name: 'New chat' }).click();
    await expect(page).toHaveURL(/\/en\/chat\/new$/);
    await expect(page.getByText('To:', { exact: true })).toBeVisible();

    await page.getByPlaceholder('Enter name or email').fill('Grace');
    await page.getByRole('button', { name: /Grace Hopper/ }).click();

    const box = page.getByPlaceholder('Type your first message…');
    await box.fill('Hi Grace!');
    await box.press('Enter');

    await expect(page).toHaveURL(/\/en\/chat\/conversation-dm$/);
  });
});
