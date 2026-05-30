import { UserRoleDetailPage } from '@/features/rbac/components/user-role-detail-page';

export default async function AdminUserRoleDetailRoute({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  return <UserRoleDetailPage roleId={roleId} />;
}
