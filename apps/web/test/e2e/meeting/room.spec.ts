import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import { MEETING_CODE, guestMeeting } from '../fixtures/data';

test.describe('Web meeting room', () => {
  test('should show the waiting room to a guest knocking to join', async ({ page }) => {
    await mockWebApi(page, { meeting: guestMeeting });
    await page.goto(`/en/${MEETING_CODE}`);

    await expect(page.getByRole('heading', { name: 'Asking to join' })).toBeVisible();
    await expect(page.getByText('Connecting…')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByText(MEETING_CODE).first()).toBeVisible();
  });

  test('should redirect to home for an unknown meeting code', async ({ page }) => {
    await mockWebApi(page, { meeting: { errorStatus: 404, code: 'MEETING_NOT_FOUND' } });
    await page.goto(`/en/${MEETING_CODE}`);

    await expect(page).toHaveURL(/\/en$/);
  });
});
