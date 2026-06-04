export interface JoinPreferences {
  micEnabled: boolean;
  cameraEnabled: boolean;
}

const KEY_PREFIX = 'open-meet:join-prefs:';

function keyFor(code: string): string {
  return `${KEY_PREFIX}${code}`;
}

export function saveJoinPreferences(code: string, prefs: JoinPreferences): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(keyFor(code), JSON.stringify(prefs));
  } catch {}
}

export function consumeJoinPreferences(code: string): JoinPreferences | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const k = keyFor(code);

  try {
    const raw = window.sessionStorage.getItem(k);

    if (!raw) {
      return null;
    }

    window.sessionStorage.removeItem(k);

    const parsed = JSON.parse(raw) as Partial<JoinPreferences>;

    return {
      micEnabled: parsed.micEnabled ?? true,
      cameraEnabled: parsed.cameraEnabled ?? true,
    };
  } catch {
    return null;
  }
}
