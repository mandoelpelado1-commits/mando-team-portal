import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSocialAccountsForUser, getAllPosts, getBudgetChangeRequests, getAllUsers } from '@/lib/db';
import { ALL_PLATFORMS, PLATFORM_LABELS } from '@/lib/oauth';
import OverviewClient from './OverviewClient';

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  const userId = Number(session!.user.id);

  const connectedPlatforms = new Set((await getSocialAccountsForUser(userId)).map((a) => a.platform));
  const upcomingPosts = (await getAllPosts())
    .filter((p) => p.status === 'scheduled')
    .slice(0, 5)
    .map((p) => ({ id: p.id, platform: p.platform, scheduledFor: p.scheduled_for }));
  const pendingBudgetCount = (await getBudgetChangeRequests()).filter((r) => r.status === 'pending').length;
  const team = (await getAllUsers()).map((u) => ({
    id: u.id,
    name: u.display_name,
    role: u.role,
    location: u.location,
    avatarUrl: u.avatar_url,
  }));

  return (
    <OverviewClient
      userName={session!.user.name || ''}
      platforms={ALL_PLATFORMS.map((p) => ({
        platform: p,
        label: PLATFORM_LABELS[p],
        connected: connectedPlatforms.has(p),
      }))}
      connectedCount={connectedPlatforms.size}
      upcomingPosts={upcomingPosts}
      pendingBudgetCount={pendingBudgetCount}
      team={team}
    />
  );
}
