import type { Metadata } from 'next';

import { HistoryList } from '@/components/client/history/history-list';

export const metadata: Metadata = {
  title: 'Meeting history',
};

export default function HistoryPage() {
  return <HistoryList />;
}
