import { HistoryDetail } from '@/features/web/history/components/history-detail';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function HistoryDetailPage({ params }: Props) {
  const { code } = await params;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <HistoryDetail code={code} />
    </div>
  );
}
