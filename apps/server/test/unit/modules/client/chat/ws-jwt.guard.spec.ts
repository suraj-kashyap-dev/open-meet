import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { ExecutionContext } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import { WsJwtGuard } from '@/modules/client/chat/ws-jwt.guard';

function contextWith(
  socket: Partial<Socket> & { data: Record<string, unknown> },
): ExecutionContext {
  return {
    switchToWs: () => ({ getClient: () => socket }),
  } as unknown as ExecutionContext;
}

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let verifyAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    verifyAsync = vi.fn().mockResolvedValue({ sub: 'u1', email: 'a@x.com', name: 'Alice' });
    const config = { getOrThrow: () => 'secret' } as unknown as ConfigService<ApiEnv, true>;
    guard = new WsJwtGuard({ verifyAsync } as unknown as JwtService, config);
  });

  describe('canActivate()', () => {
    it('should short-circuit when the socket is already authenticated', async () => {
      const socket = {
        data: { user: { id: 'u1' } },
        handshake: { auth: {}, headers: {} },
      } as never;
      await expect(guard.canActivate(contextWith(socket))).resolves.toBe(true);
      expect(verifyAsync).not.toHaveBeenCalled();
    });

    it('should reject when no token is supplied', async () => {
      const socket = { data: {}, handshake: { auth: {}, headers: {} } } as never;
      await expect(guard.canActivate(contextWith(socket))).rejects.toBeInstanceOf(WsException);
    });

    it('should verify the token and attach the user to socket.data', async () => {
      const socket = {
        data: {} as Record<string, unknown>,
        handshake: { auth: { token: 'tok' }, headers: {} },
      };
      await expect(guard.canActivate(contextWith(socket as never))).resolves.toBe(true);
      expect(socket.data.user).toEqual({ id: 'u1', email: 'a@x.com', name: 'Alice' });
    });

    it('should reject when verification fails', async () => {
      verifyAsync.mockRejectedValueOnce(new Error('bad sig'));
      const socket = { data: {}, handshake: { auth: { token: 'tok' }, headers: {} } } as never;
      await expect(guard.canActivate(contextWith(socket))).rejects.toBeInstanceOf(WsException);
    });
  });
});
