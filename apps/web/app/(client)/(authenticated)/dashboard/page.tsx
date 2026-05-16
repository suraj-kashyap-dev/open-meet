import type { Metadata } from 'next';

import { Dashboard } from '@/components/client/dashboard/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return <Dashboard />;
}
