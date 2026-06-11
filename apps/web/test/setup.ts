import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();

  if (typeof document !== 'undefined') {
    document.body.style.pointerEvents = '';

    document.body.removeAttribute('aria-hidden');

    document
      .querySelectorAll(
        '[data-radix-portal],[data-radix-popper-content-wrapper],[role="dialog"],[role="menu"]',
      )
      .forEach((el) => el.remove());
  }
});

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView ??= () => {};

  Element.prototype.hasPointerCapture ??= () => false;

  Element.prototype.setPointerCapture ??= () => {};

  Element.prototype.releasePointerCapture ??= () => {};
}

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    public pointerId?: number;
    public pointerType?: string;
    public isPrimary?: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);

      this.pointerId = params.pointerId;

      this.pointerType = params.pointerType;

      this.isPrimary = params.isPrimary;
    }
  }
  window.PointerEvent = PointerEvent as unknown as typeof window.PointerEvent;
}
