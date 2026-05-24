'use client';

import dynamic from 'next/dynamic';

const ActiveMeetingHost = dynamic(
  () => import('./active-meeting-host').then((m) => m.ActiveMeetingHost),
  { ssr: false },
);

export function ActiveMeetingMount() {
  return <ActiveMeetingHost />;
}
