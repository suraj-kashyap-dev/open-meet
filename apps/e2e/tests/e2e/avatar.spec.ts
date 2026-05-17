import { expect, test } from '@playwright/test';

import { registerNewUser } from './helpers/auth';

const fullStack = !! process.env.RUN_FULL_E2E;

// 1×1 transparent PNG (smallest valid PNG we can ship in-process).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=',
  'base64',
);

test.describe('avatar upload', () => {
  test.skip(! fullStack, 'requires API stack — set RUN_FULL_E2E=1');

  test('uploading a PNG sets the user avatar and survives a reload', async ({ page }) => {
    await registerNewUser(page);

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    const responsePromise = page.waitForResponse(
      (res) => res.url().endsWith('/api/auth/me/avatar') && res.request().method() === 'POST',
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    });

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    await expect(page.getByText('Avatar updated')).toBeVisible({ timeout: 10_000 });

    // The profile-image section now shows a Remove button when an avatar is set.
    await expect(page.getByRole('button', { name: /Remove/i })).toBeVisible();

    // After reload the avatar URL is still rendered (img element with avatars/ in src).
    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(page.locator('img[src*="avatars/"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('rejects a non-image file with a clear error', async ({ page }) => {
    await registerNewUser(page);

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'note.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });

    await expect(
      page.getByText(/Avatar must be a PNG, JPEG, WebP, or GIF/i),
    ).toBeVisible();
  });

  test('removing the avatar clears it everywhere', async ({ page }) => {
    await registerNewUser(page);

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    // Upload first.
    await page.locator('input[type="file"]').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    });

    await expect(page.getByText('Avatar updated')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Remove/i })).toBeVisible();

    // Then remove.
    await page.getByRole('button', { name: /Remove/i }).click();
    await expect(page.getByText('Avatar removed')).toBeVisible({ timeout: 10_000 });

    // No avatar => Remove button disappears, only Upload remains.
    await expect(page.getByRole('button', { name: /Remove/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Upload$/ })).toBeVisible();
  });
});
