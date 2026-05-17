import { HistoryDetail } from '@/features/history/components/history-detail';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function HistoryDetailPage({ params }: Props) {
  const { code } = await params;
  return <HistoryDetail code={code} />;
}
