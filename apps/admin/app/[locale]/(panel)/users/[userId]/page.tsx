import { UserDetailPage } from '@/features/users/components/user-detail-page';

export default async function AdminUserDetailRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <UserDetailPage userId={userId} />;
}
