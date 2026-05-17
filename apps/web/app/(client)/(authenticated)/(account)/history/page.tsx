import type { Metadata } from 'next';

import { HistoryList } from '@/features/history/components/history-list';

export const metadata: Metadata = {
  title: 'Meeting history',
};

export default function HistoryPage() {
  return <HistoryList />;
}
