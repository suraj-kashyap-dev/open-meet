import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import { emptyHistory } from '../fixtures/data';

test.describe('Web meet page', () => {
  test('should render the start + join actions', async ({ page }) => {
    await mockWebApi(page, { history: emptyHistory });

    await page.goto('/en/meet');

    await expect(
      page.getByRole('heading', { name: 'Start a new meeting', exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Join with a code', exact: true }),
    ).toBeVisible();

    await expect(page.getByRole('button', { name: 'New meeting' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Schedule for later' })).toBeVisible();

    await expect(page.getByLabel('Meeting code')).toBeVisible();
  });

  test('should keep the primary meet actions the same size', async ({ page }) => {
    await mockWebApi(page, { history: emptyHistory });

    await page.goto('/en/meet');

    const newMeetingButton = page.getByRole('button', { name: 'New meeting' });
    const scheduleButton = page.getByRole('button', { name: 'Schedule for later' });
    const joinButton = page.getByRole('button', { name: 'Join' });

    const [newMeetingBox, scheduleBox, joinBox] = await Promise.all([
      newMeetingButton.boundingBox(),
      scheduleButton.boundingBox(),
      joinButton.boundingBox(),
    ]);

    expect(newMeetingBox).not.toBeNull();

    expect(scheduleBox).not.toBeNull();

    expect(joinBox).not.toBeNull();

    expect(Math.round(newMeetingBox!.height)).toBe(Math.round(scheduleBox!.height));

    expect(Math.round(scheduleBox!.height)).toBe(Math.round(joinBox!.height));

    expect(Math.round(newMeetingBox!.width)).toBe(Math.round(scheduleBox!.width));
  });

  test('should show the empty recent-meetings state', async ({ page }) => {
    await mockWebApi(page, { history: emptyHistory });

    await page.goto('/en/meet');

    await expect(page.getByText('No meetings yet')).toBeVisible();
  });
});
