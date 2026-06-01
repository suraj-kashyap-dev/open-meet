import { useId } from 'react';

import { cn } from './cn';

interface Props {
  className?: string;
  title?: string;
}

/**
 * Open Meet brand mark - a camera-aperture iris. The hexagonal opening reads as
 * an "O" ("Open"), the lens says video/meeting, and a gradient in the theme's
 * blue accent sweeps across the six blades. A mask keeps the opening and blade
 * gaps transparent so the mark sits on any surface.
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
          <circle cx="16" cy="16" r="13.44" fill="#fff" />
          <polygon
            points="22.25,16 19.12,21.41 12.88,21.41 9.75,16 12.87,10.59 19.12,10.59"
            fill="#000"
          />
          <g stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none">
            <path d="M22.25 16 L30.16 22.3" />
            <path d="M19.12 21.41 L17.62 31.42" />
            <path d="M12.88 21.41 L3.46 25.11" />
            <path d="M9.75 16 L1.84 9.7" />
            <path d="M12.87 10.59 L14.38 0.58" />
            <path d="M19.12 10.59 L28.54 6.89" />
          </g>
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
        <circle cx="16" cy="16" r="13.44" fill="#fff" />
        <polygon
          points="22.25,16 19.12,21.41 12.88,21.41 9.75,16 12.87,10.59 19.12,10.59"
          fill="#000"
        />
        <g stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none">
          <path d="M22.25 16 L30.16 22.3" />
          <path d="M19.12 21.41 L17.62 31.42" />
          <path d="M12.88 21.41 L3.46 25.11" />
          <path d="M9.75 16 L1.84 9.7" />
          <path d="M12.87 10.59 L14.38 0.58" />
          <path d="M19.12 10.59 L28.54 6.89" />
        </g>
      </mask>

      <rect width="32" height="32" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
