import { LobbyClient } from '@/features/web/lobby/components/lobby-client';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function LobbyPage({ params }: Props) {
  const { code } = await params;

  return <LobbyClient code={code} />;
}
