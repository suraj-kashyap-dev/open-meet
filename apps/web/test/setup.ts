import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount React trees (and their Radix portals) between tests so dialogs/menus
// from one test don't leak into the next. Also clear the modal scroll-lock that
// Radix sets on <body> (pointer-events: none), which would block clicks in the
// following test if a dialog was left open when the test ended.
afterEach(() => {
  cleanup();
  if (typeof document !== 'undefined') {
    document.body.style.pointerEvents = '';
    document.body.removeAttribute('aria-hidden');
    // Remove any Radix portals/overlays a still-open dialog or menu left behind.
    document
      .querySelectorAll(
        '[data-radix-portal],[data-radix-popper-content-wrapper],[role="dialog"],[role="menu"]',
      )
      .forEach((el) => el.remove());
  }
});

// jsdom lacks a few DOM APIs that Radix primitives (Popover/Popper) rely on.
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

// jsdom has no PointerEvent constructor, so `fireEvent.pointerDown` loses
// `button`/`pointerType` and Radix menus/triggers never open. Polyfill it from
// MouseEvent so those fields survive.
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
