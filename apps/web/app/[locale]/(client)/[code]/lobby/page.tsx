import { notFound } from 'next/navigation';

import { LobbyClient } from '@/features/web/lobby/components/lobby-client';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function LobbyPage({ params }: Props) {
  const { code } = await params;
  if (code === 'register') {
    notFound();
  }

  return <LobbyClient code={code} />;
}
