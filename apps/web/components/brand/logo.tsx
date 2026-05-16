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
      <rect x="4" y="4" width="16" height="16" rx="4" className="fill-foreground" />
      <rect x="12" y="12" width="16" height="16" rx="4" className="fill-accent" />
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
      <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" opacity="0.5" />
      <rect x="12" y="12" width="16" height="16" rx="4" fill="currentColor" />
    </svg>
  );
}
