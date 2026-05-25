import { Logo } from '@open-meet/ui/logo';
import { cn } from '@open-meet/ui/cn';

interface Props {
  appName: string;
  logoUrl: string | null;
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  showName?: boolean;
}

export function BrandLockup({
  appName,
  logoUrl,
  className,
  logoClassName,
  textClassName,
  showName = true,
}: Props) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={appName}
          className={cn('h-7 w-auto max-w-40 object-contain', logoClassName)}
        />
      ) : (
        <Logo className={cn('h-7 w-7 shadow-sm', logoClassName)} title={appName} />
      )}

      {showName ? <span className={cn(textClassName)}>{appName}</span> : null}
    </span>
  );
}
