import { cn } from '@open-meet/ui/cn';

interface Props {
  className?: string;
  title?: string;
}

export function AppLogo({ className, title = 'Open Meet' }: Props) {
  return <img src="/icon.svg" alt={title} className={cn('shrink-0', className)} />;
}
