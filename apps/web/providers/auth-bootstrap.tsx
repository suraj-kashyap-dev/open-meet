'use client';

import { useAuthBootstrap } from '@/features/auth/hooks/use-auth';

export function AuthBootstrap() {
  useAuthBootstrap();
  return null;
}
