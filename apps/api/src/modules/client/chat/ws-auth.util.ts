import type { Socket } from 'socket.io';

export interface SocketUser {
  id: string;
  email: string;
  name: string;
}

const ACCESS_COOKIE = 'access_token';

export function extractAccessTokenFromSocket(socket: Socket): string | null {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth.length > 0) {
    return fromAuth;
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }

  const cookieHeader = socket.handshake.headers.cookie;
  if (typeof cookieHeader === 'string') {
    const cookies = parseCookies(cookieHeader);
    const v = cookies[ACCESS_COOKIE];
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
  }

  return null;
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key.length === 0) {
      continue;
    }
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}
