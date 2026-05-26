import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import { MEETING_CODE, hostMeeting } from '../fixtures/data';

test.describe('Web lobby page', () => {
  test('should render the pre-join lobby with devices and join action', async ({ page }) => {
    await mockWebApi(page, { meeting: hostMeeting });
    await page.goto(`/en/${MEETING_CODE}/lobby`);

    await expect(page.getByText('Get ready')).toBeVisible();
    await expect(page.getByText('Check your audio & video')).toBeVisible();
    await expect(page.getByText(MEETING_CODE).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join now' }).first()).toBeVisible();
  });
});
