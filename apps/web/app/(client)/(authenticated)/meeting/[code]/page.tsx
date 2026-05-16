import { MeetingClient } from '@/components/client/meeting/meeting-client';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function MeetingPage({ params }: Props) {
  const { code } = await params;
  return <MeetingClient code={code} />;
}
