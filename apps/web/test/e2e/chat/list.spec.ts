import { expect, test } from '@playwright/test';

import { mockChatSocket, mockWebApi } from '../fixtures/api';
import { emptyConversationList } from '../fixtures/data';

test.describe('Web chat list page', () => {
  test('should render the conversation list with a seeded direct message', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/chat');

    await expect(page.getByRole('heading', { name: 'Chat' })).toBeVisible();
    await expect(page.getByText('Select a conversation to start chatting.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New chat' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start a meeting' })).toBeVisible();
    await expect(page.getByPlaceholder('Search conversations')).toBeVisible();

    await expect(page.getByText('Recent', { exact: true })).toBeVisible();

    const dm = page.getByRole('link', { name: /Grace Hopper/ });
    await expect(dm).toBeVisible();
    await expect(page.getByText('Did you get a chance to review the deck?')).toBeVisible();
  });

  test('should show the empty state when there are no conversations', async ({ page }) => {
    await mockWebApi(page, { conversations: emptyConversationList });
    await page.goto('/en/chat');

    await expect(page.getByRole('heading', { name: 'Chat' })).toBeVisible();
    await expect(page.getByText('No conversations yet.')).toBeVisible();
  });

  test('should expose the presence status picker', async ({ page }) => {
    await mockWebApi(page);
    await mockChatSocket(page);
    await page.goto('/en/chat');

    await expect(page.getByRole('button', { name: 'Set your status' })).toBeEnabled();

    await page.getByRole('button', { name: 'Set your status' }).click();

    await expect(page.getByRole('menuitem', { name: 'Available' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Busy' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Do not disturb' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Be right back' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Away' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Offline' })).toBeVisible();
  });
});
