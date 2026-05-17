import { expect, test, type Locator, type Page } from '@playwright/test';

import { registerNewUser } from './helpers/auth';
import { installMockApi } from './helpers/mock-api';

/**
 * Pick the row container that owns a settings control (switch / combobox).
 * Robust against Tailwind class reordering — we anchor on the layout classes
 * the Row component uses and require the row to actually own a control.
 */
function rowFor(page: Page, title: string): Locator {
  return page
    .getByText(title, { exact: true })
    .locator(
      'xpath=ancestor::div[contains(@class, "items-start") and contains(@class, "justify-between")][1]',
    );
}

async function goToSettings(page: Page): Promise<void> {
  await page.goto('/settings');
  await page.locator('html[data-hydrated="true"]').waitFor();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
}

async function saveMeetingPreferences(page: Page): Promise<void> {
  await page
    .locator('form')
    .filter({ hasText: 'Join muted by default' })
    .getByRole('button', { name: /save changes/i })
    .click();

  // .first() tolerates earlier toasts that haven't auto-dismissed yet.
  await expect(page.getByText('Meeting preferences updated').first()).toBeVisible({
    timeout: 10_000,
  });
}

async function savePrivacy(page: Page): Promise<void> {
  await page
    .locator('form')
    .filter({ hasText: 'Allow direct messages' })
    .getByRole('button', { name: /save changes/i })
    .click();

  await expect(page.getByText('Privacy settings updated').first()).toBeVisible({
    timeout: 10_000,
  });
}

async function saveLocalization(page: Page): Promise<void> {
  await page
    .locator('form')
    .filter({ hasText: 'Timezone' })
    .getByRole('button', { name: /save changes/i })
    .click();

  await expect(page.getByText('Localization updated').first()).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('user settings', () => {
  test.beforeEach(async ({ page }) => {
    await installMockApi(page);
  });

  test('settings page is reachable from the sidebar', async ({ page }) => {
    await registerNewUser(page);

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await page.getByRole('link', { name: /Settings/ }).first().click();
    await page.waitForURL(/\/settings$/);

    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  });

  test('profile page does not surface settings controls', async ({ page }) => {
    await registerNewUser(page);

    await page.goto('/profile');
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(page.getByText('Join muted by default')).toHaveCount(0);
    await expect(page.getByText('Allow direct messages')).toHaveCount(0);
    await expect(page.getByText('Timezone')).toHaveCount(0);
  });

  test('Join muted by default — persists across reload', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const toggle = rowFor(page, 'Join muted by default').getByRole('switch');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await saveMeetingPreferences(page);

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(rowFor(page, 'Join muted by default').getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('Camera off by default — persists across reload', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const toggle = rowFor(page, 'Camera off by default').getByRole('switch');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();
    await saveMeetingPreferences(page);

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(rowFor(page, 'Camera off by default').getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('Default view — switching to speaker persists across reload', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const row = rowFor(page, 'Default view');
    await row.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Speaker' }).click();

    await saveMeetingPreferences(page);

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(rowFor(page, 'Default view').getByRole('combobox')).toContainText('Speaker');
  });

  test('Meeting sounds — preview button disables when sounds are off', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const row = rowFor(page, 'Meeting sounds');
    const preview = row.getByRole('button', { name: /preview sound/i });
    const toggle = row.getByRole('switch');

    await expect(preview).toBeEnabled();

    await toggle.click();
    await expect(preview).toBeDisabled();
  });

  test('Meeting sounds — toggle persists across reload', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const toggle = rowFor(page, 'Meeting sounds').getByRole('switch');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await toggle.click();
    await saveMeetingPreferences(page);

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(rowFor(page, 'Meeting sounds').getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test('Browser notifications — turns on when permission is granted', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['notifications']);

    // Replace the whole Notification class so the toggle's permission probe
    // resolves to "granted" without depending on the host browser's UI prompt.
    await page.addInitScript(() => {
      class StubNotification {
        static permission: NotificationPermission = 'granted';
        static requestPermission(): Promise<NotificationPermission> {
          return Promise.resolve('granted');
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(_title: string, _options?: NotificationOptions) {
          /* no-op */
        }
      }
      (window as unknown as { Notification: typeof StubNotification }).Notification =
        StubNotification;
    });

    await registerNewUser(page);
    await goToSettings(page);

    const toggle = rowFor(page, 'Browser notifications').getByRole('switch');

    // Default is on. Commit "off" first so the subsequent flip-on is a real
    // dirty change (react-hook-form clears dirty when the field returns to
    // its default value, which would otherwise disable the Save button).
    if ((await toggle.getAttribute('aria-checked')) === 'true') {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
      await saveMeetingPreferences(page);
    }

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await saveMeetingPreferences(page);

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(
      rowFor(page, 'Browser notifications').getByRole('switch'),
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('Browser notifications — refuses to enable when permission is denied', async ({
    page,
  }) => {
    // Same trick as above but pin the permission to denied so the toggle is
    // forced down the rejection branch.
    await page.addInitScript(() => {
      class StubNotification {
        static permission: NotificationPermission = 'denied';
        static requestPermission(): Promise<NotificationPermission> {
          return Promise.resolve('denied');
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(_title: string, _options?: NotificationOptions) {
          /* no-op */
        }
      }
      (window as unknown as { Notification: typeof StubNotification }).Notification =
        StubNotification;
    });

    await registerNewUser(page);
    await goToSettings(page);

    const toggle = rowFor(page, 'Browser notifications').getByRole('switch');

    if ((await toggle.getAttribute('aria-checked')) === 'true') {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
      await saveMeetingPreferences(page);
    }

    const startState = await toggle.getAttribute('aria-checked');
    await toggle.click();

    await expect(
      page.getByText(/permission denied|not supported/i).first(),
    ).toBeVisible({ timeout: 5_000 });

    await expect(toggle).toHaveAttribute('aria-checked', startState!);
  });

  test('Privacy — allow direct messages persists across reload', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const toggle = rowFor(page, 'Allow direct messages').getByRole('switch');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await toggle.click();
    await savePrivacy(page);

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(rowFor(page, 'Allow direct messages').getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test('Privacy — show email to participants persists across reload', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const toggle = rowFor(page, 'Show email to participants').getByRole('switch');
    const initial = await toggle.getAttribute('aria-checked');

    await toggle.click();
    await savePrivacy(page);

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(
      rowFor(page, 'Show email to participants').getByRole('switch'),
    ).toHaveAttribute('aria-checked', initial === 'true' ? 'false' : 'true');
  });

  test('Privacy — profile visibility persists across reload', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const row = rowFor(page, 'Profile visibility');
    await row.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Private' }).click();

    await savePrivacy(page);

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(rowFor(page, 'Profile visibility').getByRole('combobox')).toContainText(
      'Private',
    );
  });

  test('Localization — timezone change persists across reload', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const tzTrigger = page
      .locator('form')
      .filter({ hasText: 'Timezone' })
      .getByRole('combobox')
      .first();

    await tzTrigger.click();
    await page.getByRole('option', { name: 'Asia/Kolkata' }).click();

    await saveLocalization(page);

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(
      page.locator('form').filter({ hasText: 'Timezone' }).getByRole('combobox').first(),
    ).toContainText('Asia/Kolkata');
  });

  test('Localization — language change persists across reload', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const langTrigger = page
      .locator('form')
      .filter({ hasText: 'Language' })
      .getByRole('combobox')
      .nth(1);

    await langTrigger.click();
    await page.getByRole('option', { name: 'Español' }).click();

    await saveLocalization(page);

    await page.reload();
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(
      page.locator('form').filter({ hasText: 'Language' }).getByRole('combobox').nth(1),
    ).toContainText('Español');
  });
});

test.describe('settings runtime application — lobby', () => {
  test.beforeEach(async ({ page }) => {
    await installMockApi(page);
  });

  test('defaultMicMuted is applied when entering the lobby', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const micToggle = rowFor(page, 'Join muted by default').getByRole('switch');
    if ((await micToggle.getAttribute('aria-checked')) === 'false') {
      await micToggle.click();
    }
    await saveMeetingPreferences(page);

    await page.goto('/');
    await page.locator('html[data-hydrated="true"]').waitFor();
    await page.getByRole('button', { name: /new meeting/i }).first().click();

    await page.waitForURL(/\/[a-z0-9-]+\/lobby$/, { timeout: 30_000 });
    await page.locator('html[data-hydrated="true"]').waitFor();

    // Once the lobby applies the setting the mic button flips to "off" state.
    // The aria-label encodes the *next* action, so an off mic reads "Unmute microphone".
    await expect(
      page.getByRole('button', { name: 'Unmute microphone' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('defaultCameraOff is applied when entering the lobby', async ({ page }) => {
    await registerNewUser(page);
    await goToSettings(page);

    const camToggle = rowFor(page, 'Camera off by default').getByRole('switch');
    if ((await camToggle.getAttribute('aria-checked')) === 'false') {
      await camToggle.click();
    }
    await saveMeetingPreferences(page);

    await page.goto('/');
    await page.locator('html[data-hydrated="true"]').waitFor();
    await page.getByRole('button', { name: /new meeting/i }).first().click();

    await page.waitForURL(/\/[a-z0-9-]+\/lobby$/, { timeout: 30_000 });
    await page.locator('html[data-hydrated="true"]').waitFor();

    await expect(page.getByRole('button', { name: 'Turn on camera' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Camera is off')).toBeVisible();
  });
});
