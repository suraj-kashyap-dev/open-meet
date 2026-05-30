import { notFound } from 'next/navigation';

import { MeetingClient } from '@/features/web/meeting/components/meeting-client';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function MeetingPage({ params }: Props) {
  const { code } = await params;
  if (code === 'register') {
    notFound();
  }

  return <MeetingClient code={code} />;
}
