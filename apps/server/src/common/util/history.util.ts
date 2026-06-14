import { ShareHistoryMode, type ShareHistoryDto } from '@open-meet/types';

export function laterDate(left: Date | null, right: Date | null): Date | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left > right ? left : right;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function resolveHistoryCutoff(history: ShareHistoryDto | undefined, now: Date): Date | null {
  if (!history || history.mode === ShareHistoryMode.ALL) {
    return null;
  }

  if (history.mode === ShareHistoryMode.NONE) {
    return now;
  }

  const days = Math.max(0, history.days ?? 0);

  return new Date(now.getTime() - days * DAY_MS);
}
