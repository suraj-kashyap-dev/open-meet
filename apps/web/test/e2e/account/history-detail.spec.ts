import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import {
  MEETING_CODE,
  emptyMessages,
  emptyRecordings,
  endedMeeting,
  messagePage,
  recordings,
} from '../fixtures/data';

test.describe('Web meeting history detail page', () => {
  test('should render the meeting summary, recordings, and transcript', async ({ page }) => {
    await mockWebApi(page, { meeting: endedMeeting, recordings, messages: messagePage });
    await page.goto(`/en/history/${MEETING_CODE}`);

    await expect(page.getByRole('link', { name: 'Back to history' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chat transcript' })).toBeVisible();
    await expect(page.getByText('Thanks everyone for joining today.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download' })).toBeVisible();
  });

  test('should show empty states for a meeting without recordings or messages', async ({ page }) => {
    await mockWebApi(page, {
      meeting: endedMeeting,
      recordings: emptyRecordings,
      messages: emptyMessages,
    });
    await page.goto(`/en/history/${MEETING_CODE}`);

    await expect(page.getByText('No recordings for this meeting')).toBeVisible();
    await expect(page.getByText('No messages were sent in this meeting.')).toBeVisible();
  });
});
