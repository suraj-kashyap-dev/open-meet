import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import { INVITE_TOKEN, pendingInvite } from '../fixtures/data';

test.describe('Web accept-invite page', () => {
  test('should render the set-password form for a valid invite token', async ({ page }) => {
    await mockWebApi(page, { me: null });

    await page.goto(`/en/accept-invite?token=${INVITE_TOKEN}`);

    await expect(page.getByRole('heading', { name: 'Set your password' })).toBeVisible();

    await expect(page.getByText(`You're joining as ${pendingInvite.email}.`)).toBeVisible();

    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();

    await expect(page.getByLabel('Confirm password')).toBeVisible();

    await expect(page.getByText('Timezone')).toBeVisible();

    await expect(page.getByText('Language', { exact: true })).toBeVisible();

    await expect(page.getByLabel('Bio')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('should reject mismatched passwords without leaving the page', async ({ page }) => {
    await mockWebApi(page, { me: null });

    await page.goto(`/en/accept-invite?token=${INVITE_TOKEN}`);

    await page.getByLabel('Password', { exact: true }).fill('supersecret');

    await page.getByLabel('Confirm password').fill('different1');

    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();

    await expect(page).toHaveURL(/\/en\/accept-invite/);
  });

  test('should accept the invite and land on chat (the chat-first home)', async ({ page }) => {
    await mockWebApi(page, { me: null, authenticateOnLogin: true });

    await page.goto(`/en/accept-invite?token=${INVITE_TOKEN}`);

    await page.getByLabel('Password', { exact: true }).fill('supersecret');

    await page.getByLabel('Confirm password').fill('supersecret');

    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/en\/chat$/);

    await expect(page.getByRole('heading', { name: 'Chat' })).toBeVisible();
  });

  test('should show an error for an invalid or expired invite link', async ({ page }) => {
    await mockWebApi(page, { me: null, invite: null });

    await page.goto(`/en/accept-invite?token=${INVITE_TOKEN}`);

    await expect(page.getByText('This invitation link is invalid or has expired.')).toBeVisible();

    await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible();
  });
});
