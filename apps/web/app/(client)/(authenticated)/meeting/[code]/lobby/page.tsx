import { LobbyClient } from '@/components/client/lobby/lobby-client';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function LobbyPage({ params }: Props) {
  const { code } = await params;
  return <LobbyClient code={code} />;
}
