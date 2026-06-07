import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PushService } from '@/modules/client/push/services/push.service';
import { type PushRepository } from '@/modules/client/push/repositories/push.repository';

const sendNotification = vi.fn();
const setVapidDetails = vi.fn();

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => setVapidDetails(...args),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}));

function makeConfig(keys: boolean) {
  return {
    get: (key: string) =>
      ({
        VAPID_PUBLIC_KEY: keys ? 'pub' : undefined,
        VAPID_PRIVATE_KEY: keys ? 'priv' : undefined,
        VAPID_SUBJECT: 'mailto:test@example.com',
      })[key],
  } as never;
}

const payload = { kind: 'chat' as const, title: 'T', body: 'B', url: '/chat/c1' };

describe('PushService', () => {
  let repo: {
    findManyByUserId: ReturnType<typeof vi.fn>;
    deleteByEndpoints: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    sendNotification.mockReset();
    setVapidDetails.mockReset();
    repo = {
      findManyByUserId: vi.fn(),
      deleteByEndpoints: vi.fn().mockResolvedValue(undefined),
    };
  });

  function service(keys = true) {
    return new PushService(repo as unknown as PushRepository, makeConfig(keys));
  }

  it('sends to every subscription of the user', async () => {
    repo.findManyByUserId.mockResolvedValue([
      { endpoint: 'e1', p256dh: 'a', auth: 'b' },
      { endpoint: 'e2', p256dh: 'c', auth: 'd' },
    ]);
    sendNotification.mockResolvedValue(undefined);

    await service().sendToUser('u1', payload);

    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(repo.deleteByEndpoints).not.toHaveBeenCalled();
  });

  it('prunes subscriptions that return 404 or 410', async () => {
    repo.findManyByUserId.mockResolvedValue([
      { endpoint: 'gone-410', p256dh: 'a', auth: 'b' },
      { endpoint: 'gone-404', p256dh: 'c', auth: 'd' },
      { endpoint: 'ok', p256dh: 'e', auth: 'f' },
    ]);
    sendNotification.mockImplementation((sub: { endpoint: string }) => {
      if (sub.endpoint === 'gone-410') return Promise.reject({ statusCode: 410 });
      if (sub.endpoint === 'gone-404') return Promise.reject({ statusCode: 404 });
      return Promise.resolve(undefined);
    });

    await service().sendToUser('u1', payload);

    expect(repo.deleteByEndpoints).toHaveBeenCalledTimes(1);
    const pruned = repo.deleteByEndpoints.mock.calls[0]![0] as string[];
    expect(pruned.sort()).toEqual(['gone-404', 'gone-410']);
  });

  it('does not prune on transient (non-404/410) errors', async () => {
    repo.findManyByUserId.mockResolvedValue([{ endpoint: 'e1', p256dh: 'a', auth: 'b' }]);
    sendNotification.mockRejectedValue({ statusCode: 500 });

    await service().sendToUser('u1', payload);

    expect(repo.deleteByEndpoints).not.toHaveBeenCalled();
  });

  it('is a no-op when no subscriptions exist', async () => {
    repo.findManyByUserId.mockResolvedValue([]);

    await service().sendToUser('u1', payload);

    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('is disabled (no send) when VAPID keys are not configured', async () => {
    const svc = service(false);
    expect(svc.isEnabled()).toBe(false);

    await svc.sendToUser('u1', payload);

    expect(repo.findManyByUserId).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
