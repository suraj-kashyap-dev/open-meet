import { useId } from 'react';

import { cn } from './cn';

interface Props {
  className?: string;
  title?: string;
}

/**
 * Open Meet brand mark - a play/join triangle nested inside a chat speech
 * bubble. The bubble (with its soft bottom-left tail) says persistent
 * messaging; the play triangle is the universal "start / join a meeting" cue -
 * the two halves of the product in one calm mark. A gradient in the theme's
 * blue accent sweeps across the bubble, and a mask keeps the triangle and
 * everything outside the bubble transparent so it sits on any surface.
 *
 * Multiple instances reuse the `omAccent` / `omIris` ids; this is safe because
 * every definition is byte-identical and `url(#…)` resolves to the first.
 */
export function Logo({ className, title = 'Open Meet' }: Props) {
  // Unique ids per instance - multiple logos render at once (header, sidebar,
  // sheet) and shared ids resolve to whichever is first in the DOM, which can
  // sit inside a `display:none` container and make the mark render blank.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `omAccent-${uid}`;
  const maskId = `omIris-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={cn('shrink-0 rounded-full', className)}
    >
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="0.55" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>

        <mask id={maskId}>
          <path
            d="M11 4 H21 A7 7 0 0 1 28 11 V16 A7 7 0 0 1 21 23 H15 L8.5 27.5 L11 23 A7 7 0 0 1 4 16 V11 A7 7 0 0 1 11 4 Z"
            fill="#fff"
          />
          <path
            d="M13 9 L13 19 L21.5 14 Z"
            fill="#000"
            stroke="#000"
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </mask>
      </defs>

      <rect width="32" height="32" fill={`url(#${gradId})`} mask={`url(#${maskId})`} />
    </svg>
  );
}

/**
 * Monochrome variant for single-color contexts - the same iris filled with
 * `currentColor` instead of the gradient.
 */
export function LogoMark({ className }: { className?: string }) {
  const maskId = `omIrisMono-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn('shrink-0 rounded-full', className)}
    >
      <mask id={maskId}>
        <path
          d="M11 4 H21 A7 7 0 0 1 28 11 V16 A7 7 0 0 1 21 23 H15 L8.5 27.5 L11 23 A7 7 0 0 1 4 16 V11 A7 7 0 0 1 11 4 Z"
          fill="#fff"
        />
        <path
          d="M13 9 L13 19 L21.5 14 Z"
          fill="#000"
          stroke="#000"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </mask>

      <rect width="32" height="32" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
