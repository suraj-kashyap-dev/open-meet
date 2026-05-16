import type { Metadata } from 'next';

import { Dashboard } from '@/components/client/dashboard/dashboard';

export const metadata: Metadata = {
  title: 'App',
};

export default function AppPage() {
  return <Dashboard />;
}
