import type { Metadata } from 'next';

import { TeamsView } from '@/features/web/chat/components/teams-view';

export const metadata: Metadata = {
  title: 'Teams',
};

export default function TeamsPage() {
  return <TeamsView />;
}
