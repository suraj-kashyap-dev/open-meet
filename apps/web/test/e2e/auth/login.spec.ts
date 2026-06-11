import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web login page', () => {
  test('should render the sign-in form', async ({ page }) => {
    await mockWebApi(page, { me: null });

    await page.goto('/en/login');

    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();

    await expect(page.getByLabel('Email')).toBeVisible();

    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('should show a validation error for an invalid email', async ({ page }) => {
    await mockWebApi(page, { me: null });

    await page.goto('/en/login');

    await page.getByLabel('Email').fill('not-an-email');

    await page.getByLabel('Password', { exact: true }).fill('secret123');

    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Enter a valid email')).toBeVisible();

    await expect(page).toHaveURL(/\/en\/login$/);
  });

  test('should not treat /register as a meeting code', async ({ page }) => {
    await mockWebApi(page, { me: null });

    await page.goto('/en/register');

    await expect(page).toHaveURL(/\/en\/register$/);

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  test('should sign in and land on chat (the chat-first home)', async ({ page }) => {
    await mockWebApi(page, { me: null, authenticateOnLogin: true });

    await page.goto('/en/login');

    await page.getByLabel('Email').fill('ada@example.com');

    await page.getByLabel('Password', { exact: true }).fill('supersecret');

    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/en\/chat$/);

    await expect(page.getByRole('heading', { name: 'Chat' })).toBeVisible();
  });
});
