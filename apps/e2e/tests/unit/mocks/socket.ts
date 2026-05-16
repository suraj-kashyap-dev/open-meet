import { vi } from 'vitest';

type Listener = (...args: unknown[]) => void;

export interface MockSocket {
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  connected: boolean;
  __trigger: (event: string, ...args: unknown[]) => void;
}

export function createMockSocket(): MockSocket {
  const listeners = new Map<string, Set<Listener>>();

  const add = (event: string, cb: Listener) => {
    const set = listeners.get(event) ?? new Set();
    set.add(cb);
    listeners.set(event, set);
  };

  const remove = (event: string, cb?: Listener) => {
    if (! cb) {
      listeners.delete(event);
      return;
    }

    listeners.get(event)?.delete(cb);
  };

  return {
    emit: vi.fn(),
    on: vi.fn(add),
    off: vi.fn(remove),
    once: vi.fn((event: string, cb: Listener) => {
      const wrapper: Listener = (...args) => {
        cb(...args);
        remove(event, wrapper);
      };
      add(event, wrapper);
    }),
    disconnect: vi.fn(),
    connected: true,
    __trigger(event, ...args) {
      const set = listeners.get(event);

      if (! set) {
        return;
      }

      for (const cb of Array.from(set)) {
        cb(...args);
      }
    },
  };
}
