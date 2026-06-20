import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useChatSocket } from '@/features/web/chat/hooks/use-chat-socket';

const disconnect = vi.fn();
const io = vi.fn((_url?: string, _options?: unknown) => ({ disconnect }));

vi.mock('socket.io-client', () => ({
  io: (url?: string, options?: unknown) => io(url, options),
}));

function StrictModeWrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

describe('useChatSocket', () => {
  it('keeps the socket alive across the Strict Mode effect probe', () => {
    vi.useFakeTimers();

    disconnect.mockReset();

    io.mockClear();

    const { result, unmount } = renderHook(() => useChatSocket(true), {
      wrapper: StrictModeWrapper,
    });

    expect(result.current).not.toBeNull();

    expect(io).toHaveBeenCalledTimes(1);

    act(() => {
      vi.runAllTimers();
    });

    expect(disconnect).not.toHaveBeenCalled();

    unmount();

    act(() => {
      vi.runAllTimers();
    });

    expect(disconnect).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
