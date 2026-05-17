import { expect, test } from '@playwright/test';

import { registerNewUser } from './helpers/auth';

const fullStack = !!process.env.RUN_FULL_E2E;

test.describe('auth — form validation', () => {
  test('login blocks submission with an invalid email', async ({ page }) => {
    await page.goto('/login');
    await page.locator('html[data-hydrated="true"]').waitFor();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('whatever');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Enter a valid email')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('register requires a password ≥ 8 chars', async ({ page }) => {
    await page.goto('/register');
    await page.locator('html[data-hydrated="true"]').waitFor();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled();

    await page.getByLabel('Name').fill('Ada');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('show/hide password toggle flips input type', async ({ page }) => {
    await page.goto('/login');
    await page.locator('html[data-hydrated="true"]').waitFor();

    const password = page.getByLabel('Password', { exact: true });

    await password.fill('a-secret');
    await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });
});

test.describe('auth — happy paths', () => {
  test.skip(!fullStack, 'requires API stack — set RUN_FULL_E2E=1');

  test('register creates a session and lands on the dashboard', async ({ page }) => {
    const user = await registerNewUser(page, 'Ada Lovelace');

    await expect(
      page.getByRole('heading', {
        name: new RegExp(`(morning|afternoon|evening|up late).*ada`, 'i'),
      }),
    ).toBeVisible();

    // Cached user is persisted to localStorage for hydration-flash protection.
    const cached = await page.evaluate(() => window.localStorage.getItem('open-meet:user'));
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached as string).email).toBe(user.email);
  });

  test('logout clears cached user and bounces to /login', async ({ page }) => {
    await registerNewUser(page, 'Ada');

    await page.locator('header').getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });

    const cached = await page.evaluate(() => window.localStorage.getItem('open-meet:user'));
    expect(cached).toBeNull();
  });

  test('logged-in user is bounced off /login and /register to the dashboard', async ({ page }) => {
    await registerNewUser(page, 'Ada');

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('html[data-hydrated="true"]').waitFor();
    await page.waitForURL((url) => new URL(url).pathname === '/', { timeout: 15_000 });

    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('html[data-hydrated="true"]').waitFor();
    await page.waitForURL((url) => new URL(url).pathname === '/', { timeout: 15_000 });
  });

  test('expired session: 401 on protected request redirects to /login', async ({
    page,
    context,
  }) => {
    await registerNewUser(page, 'Ada');

    // Wipe cookies behind React's back to simulate expiry.
    await context.clearCookies();

    // Hitting "New meeting" calls POST /meetings which now 401s.
    await page.getByRole('button', { name: 'New meeting' }).click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
    const cached = await page.evaluate(() => window.localStorage.getItem('open-meet:user'));
    expect(cached).toBeNull();
  });
});
