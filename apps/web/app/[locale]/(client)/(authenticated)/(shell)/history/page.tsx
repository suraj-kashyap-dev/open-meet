import type { Metadata } from 'next';

import { HistoryList } from '@/features/web/history/components/history-list';

export const metadata: Metadata = {
  title: 'Meeting history',
};

export default function HistoryPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <HistoryList />
    </div>
  );
}
