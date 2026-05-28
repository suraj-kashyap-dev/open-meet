import { TeamDetailPage } from '@/features/teams/components/team-detail-page';

export default async function AdminTeamDetailRoute({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  return <TeamDetailPage teamId={teamId} />;
}
