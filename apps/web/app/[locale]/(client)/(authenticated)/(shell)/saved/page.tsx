import type { Metadata } from 'next';

import { SavedView } from '@/features/web/chat/components/saved-view';

export const metadata: Metadata = {
  title: 'Saved',
};

export default function SavedPage() {
  return <SavedView />;
}
