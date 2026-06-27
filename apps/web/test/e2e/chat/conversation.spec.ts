import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web chat conversation thread', () => {
  test('should hide mobile bottom navigation while a conversation is open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await mockWebApi(page);

    await page.goto('/en/chat/conversation-dm');

    await expect(page.getByTestId('mobile-bottom-nav')).toHaveCount(0);

    await expect(page.getByPlaceholder('Write a message…')).toBeVisible();
  });

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
