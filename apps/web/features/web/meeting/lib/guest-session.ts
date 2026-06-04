'use client';

import type { GuestMeetingSessionDto, UserDto } from '@open-meet/types';

import type { MeetingViewer } from '@/features/web/meeting/stores/active-meeting-store';

const STORAGE_KEY = 'open-meet:guest-meeting-sessions';

export interface GuestMeetingSession extends GuestMeetingSessionDto {
  meetingCode: string;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function readAll(): Record<string, GuestMeetingSession> {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as Record<string, GuestMeetingSession>;
  } catch {
    return {};
  }
}

function writeAll(next: Record<string, GuestMeetingSession>): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    if (Object.keys(next).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function isExpired(expiresAt: string): boolean {
  const time = Date.parse(expiresAt);
  return Number.isNaN(time) || time <= Date.now();
}

export function getGuestSession(code: string): GuestMeetingSession | null {
  const all = readAll();
  const session = all[code];

  if (!session) {
    return null;
  }

  if (isExpired(session.expiresAt)) {
    delete all[code];
    writeAll(all);
    return null;
  }

  return session;
}

export function saveGuestSession(
  code: string,
  session: GuestMeetingSessionDto,
): GuestMeetingSession {
  const next: GuestMeetingSession = { ...session, meetingCode: code };
  const all = readAll();
  all[code] = next;
  writeAll(all);
  return next;
}

export function clearGuestSession(code: string): void {
  const all = readAll();
  delete all[code];
  writeAll(all);
}

export function viewerFromUser(user: UserDto): MeetingViewer {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    isGuest: false,
  };
}

export function viewerFromGuest(session: GuestMeetingSession): MeetingViewer {
  return {
    id: session.user.id,
    name: session.user.name,
    avatar: session.user.avatar,
    isGuest: true,
  };
}
