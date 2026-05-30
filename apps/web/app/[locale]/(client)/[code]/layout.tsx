import type { ReactNode } from 'react';

import { ActiveMeetingMount } from '@/features/web/meeting/components/active-meeting-mount';

export default function MeetingRouteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ActiveMeetingMount />
    </>
  );
}
