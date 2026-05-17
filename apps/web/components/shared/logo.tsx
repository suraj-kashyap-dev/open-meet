import { cn } from '@/lib/cn';

interface Props {
  className?: string;
  title?: string;
}

export function Logo({ className, title = 'Open Meet' }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={cn('shrink-0', className)}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" className="fill-foreground" />

      <rect x="11" y="11" width="18" height="18" rx="5" className="fill-accent" />

      <path d="M17 15.5 L25 20 L17 24.5 Z" fill="#ffffff" />
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity="0.5" />

      <rect x="11" y="11" width="18" height="18" rx="5" fill="currentColor" />

      <path d="M17 15.5 L25 20 L17 24.5 Z" fill="var(--background)" />
    </svg>
  );
}
