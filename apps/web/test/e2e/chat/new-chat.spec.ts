import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web new chat (inline "To:" composer)', () => {
  test('should compose a new chat and land on the conversation after sending', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/chat');

    // The compose action in the list header opens the inline draft.
    await page.getByRole('link', { name: 'New chat' }).click();
    await expect(page).toHaveURL(/\/en\/chat\/new$/);
    await expect(page.getByText('To:', { exact: true })).toBeVisible();

    // Pick a recipient from the teammate suggestions.
    await page.getByPlaceholder('Enter name or email').fill('Grace');
    await page.getByRole('button', { name: /Grace Hopper/ }).click();

    // Type the first message and send - this resolves/opens the DM and navigates to it.
    const box = page.getByPlaceholder('Type your first message…');
    await box.fill('Hi Grace!');
    await box.press('Enter');

    await expect(page).toHaveURL(/\/en\/chat\/conversation-dm$/);
  });
});
