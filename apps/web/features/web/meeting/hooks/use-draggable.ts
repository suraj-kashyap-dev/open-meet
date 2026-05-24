'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import type { MiniPosition } from '@/features/web/meeting/stores';

interface Size {
  width: number;
  height: number;
}

interface Viewport {
  width: number;
  height: number;
}

export function clampToViewport(
  pos: MiniPosition,
  size: Size,
  viewport: Viewport,
  margin = 16,
): MiniPosition {
  const maxX = Math.max(margin, viewport.width - size.width - margin);
  const maxY = Math.max(margin, viewport.height - size.height - margin);

  return {
    x: Math.min(Math.max(margin, pos.x), maxX),
    y: Math.min(Math.max(margin, pos.y), maxY),
  };
}

interface DraggableOptions {
  size: Size;
  value: MiniPosition | null;
  onChange: (position: MiniPosition) => void;
  margin?: number;
}

export function useDraggable({ size, value, onChange, margin = 16 }: DraggableOptions) {
  const [dragging, setDragging] = useState(false);
  const origin = useRef<{ pointerX: number; pointerY: number; posX: number; posY: number } | null>(
    null,
  );

  useEffect(() => {
    if (value !== null || typeof window === 'undefined') {
      return;
    }

    onChange(
      clampToViewport(
        { x: window.innerWidth, y: window.innerHeight },
        size,
        { width: window.innerWidth, height: window.innerHeight },
        margin,
      ),
    );
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (!value) {
        return;
      }

      onChange(
        clampToViewport(
          value,
          size,
          { width: window.innerWidth, height: window.innerHeight },
          margin,
        ),
      );
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [value, size, margin, onChange]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if ((event.target as HTMLElement).closest('button, a, input')) {
        return;
      }

      event.preventDefault();
      const start = value ?? { x: 0, y: 0 };
      origin.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        posX: start.x,
        posY: start.y,
      };
      setDragging(true);
    },
    [value],
  );

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const o = origin.current;
      if (!o) {
        return;
      }

      const next = {
        x: o.posX + (event.clientX - o.pointerX),
        y: o.posY + (event.clientY - o.pointerY),
      };

      onChange(
        clampToViewport(
          next,
          size,
          { width: window.innerWidth, height: window.innerHeight },
          margin,
        ),
      );
    };

    const onUp = () => {
      origin.current = null;
      setDragging(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, size, margin, onChange]);

  return { dragging, handleProps: { onPointerDown } };
}
