import { RoleDetailPage } from '@/features/rbac/components/role-detail-page';

export default async function AdminRoleDetailRoute({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;

  return <RoleDetailPage roleId={roleId} />;
}
