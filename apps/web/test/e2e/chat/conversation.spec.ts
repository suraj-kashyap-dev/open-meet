import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web chat conversation thread', () => {
  test('should open a conversation showing the peer, history, and composer', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/chat/conversation-dm');

    await expect(page.getByText('Grace Hopper').first()).toBeVisible();
    await expect(page.getByText('Did you get a chance to review the deck?').last()).toBeVisible();
    await expect(page.getByPlaceholder('Write a message…')).toBeVisible();
  });

  test('should optimistically show a message after sending', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/chat/conversation-dm');

    const box = page.getByPlaceholder('Write a message…');
    await box.fill('Hello from the e2e suite');
    await box.press('Enter');

    await expect(page.getByText('Hello from the e2e suite')).toBeVisible();
  });
});
