'use client';

import { useAuthBootstrap } from '@/features/web/auth/hooks/use-auth';

export function AuthBootstrap() {
  useAuthBootstrap();
  return null;
}
