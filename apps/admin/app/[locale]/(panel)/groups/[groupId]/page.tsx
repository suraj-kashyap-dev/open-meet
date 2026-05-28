import { GroupDetailPage } from '@/features/groups/components/group-detail-page';

export default async function AdminGroupDetailRoute({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return <GroupDetailPage groupId={groupId} />;
}
