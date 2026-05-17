import { expect, type Page } from '@playwright/test';

export interface NewUser {
  name: string;
  email: string;
  password: string;
}

export async function registerNewUser(page: Page, name = 'Ada Lovelace'): Promise<NewUser> {
  const email = `e2e+${Date.now()}+${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = 'correct horse battery';

  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled();

  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  // Wait for the POST to settle so we know the auth cookies are set before
  // we start polling for the post-register URL.
  const registerResponse = page.waitForResponse(
    (res) => res.url().endsWith('/api/auth/register') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Create account' }).click();
  await registerResponse;

  await page.waitForURL((url) => new URL(url).pathname === '/', { timeout: 30_000 });
  // Wait for the dashboard greeting — proves AuthGuard has resolved and the
  // Dashboard component has mounted with its event handlers attached.
  await expect(
    page
      .getByRole('heading', { level: 1 })
      .filter({ hasText: /(morning|afternoon|evening|up late)/i }),
  ).toBeVisible({ timeout: 15_000 });

  return { name, email, password };
}

/** Sign in with already-registered credentials. */
export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 10_000 });

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL((url) => new URL(url).pathname === '/', { timeout: 15_000 });
}

/**
 * Open the account dropdown in the header. The trigger is the last button in
 * the header (after the theme toggle).
 */
export async function openAccountMenu(page: Page): Promise<void> {
  await page.locator('header').getByRole('button').last().click();
  await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
}
