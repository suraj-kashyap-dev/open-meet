'use client';

import Link from 'next/link';

import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useCurrentUser } from '@/hooks/client/use-auth';

interface Props {
  initialSession?: boolean;
  className?: string;
}

export function GetStartedButton({ initialSession = false, className }: Props) {
  const { data: user } = useCurrentUser();

  const isLoggedIn = user !== undefined ? user !== null : initialSession;

  const href = isLoggedIn ? '/app' : '/register';

  const label = isLoggedIn ? 'Open App →' : 'Get started →';

  return (
    <ShimmerButton asChild>
      <Link href={href} className={className}>
        {label}
      </Link>
    </ShimmerButton>
  );
}
