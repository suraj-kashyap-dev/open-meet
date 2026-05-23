import type { Socket } from 'socket.io';
import { describe, expect, it } from 'vitest';

import { extractAccessTokenFromSocket } from '@/modules/client/chat/ws-auth.util';

function socket(handshake: Record<string, unknown>): Socket {
  return { handshake } as unknown as Socket;
}

describe('extractAccessTokenFromSocket()', () => {
  it('should prefer the handshake auth token', () => {
    expect(extractAccessTokenFromSocket(socket({ auth: { token: 'tok-auth' }, headers: {} }))).toBe(
      'tok-auth',
    );
  });

  it('should fall back to a Bearer authorization header', () => {
    expect(
      extractAccessTokenFromSocket(
        socket({ auth: {}, headers: { authorization: 'Bearer tok-hdr' } }),
      ),
    ).toBe('tok-hdr');
  });

  it('should fall back to the access_token cookie', () => {
    expect(
      extractAccessTokenFromSocket(
        socket({ auth: {}, headers: { cookie: 'other=1; access_token=tok-cookie; x=2' } }),
      ),
    ).toBe('tok-cookie');
  });

  it('should return null when no token is present anywhere', () => {
    expect(extractAccessTokenFromSocket(socket({ auth: {}, headers: {} }))).toBeNull();
  });
});
