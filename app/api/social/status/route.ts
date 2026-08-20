import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSocialAccountsForUser, getSocialAppCredentialsForUser, getAllSocialAccountsStatus, getAllUsers } from '@/lib/db';
import { ALL_PLATFORMS, PLATFORM_LABELS, redirectUri } from '@/lib/oauth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number(session.user.id);
  const accounts = await getSocialAccountsForUser(userId);
  const byPlatform = new Map(accounts.map((a) => [a.platform, a]));
  const credentials = await getSocialAppCredentialsForUser(userId);
  const credByPlatform = new Map(credentials.map((c) => [c.platform, c]));

  const platforms = ALL_PLATFORMS.map((platform) => {
    const account = byPlatform.get(platform);
    const cred = credByPlatform.get(platform);
    return {
      platform,
      label: PLATFORM_LABELS[platform],
      configured: Boolean(cred),
      clientId: cred?.client_id || null,
      connected: Boolean(account),
      platformUsername: account?.platform_username || null,
      connectedAt: account?.connected_at || null,
      redirectUri: redirectUri(platform),
    };
  });

  // Team-wide view: who's connected to what, never tokens or app secrets —
  // "we all see analytics, we just won't share passwords."
  const allStatus = await getAllSocialAccountsStatus();
  const users = new Map((await getAllUsers()).map((u) => [u.id, u.display_name]));
  const team = allStatus.map((a) => ({
    userName: users.get(a.user_id) || 'Unknown',
    platform: a.platform,
    platformUsername: a.platform_username,
    connectedAt: a.connected_at,
  }));

  return NextResponse.json({ platforms, team });
}
