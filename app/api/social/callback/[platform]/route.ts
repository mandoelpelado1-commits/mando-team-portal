import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyState } from '@/lib/oauthState';
import { exchangeCodeForToken } from '@/lib/oauth';
import { upsertSocialAccount, getSocialAppCredential, Platform } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL('/login', req.url));

  const { platform: platformParam } = await params;
  const platform = platformParam as Platform;
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/dashboard/socials?error=${encodeURIComponent(oauthError)}&platform=${platform}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL(`/dashboard/socials?error=missing_code&platform=${platform}`, req.url));
  }

  const statePayload = verifyState(state);
  if (!statePayload || statePayload.platform !== platform || statePayload.userId !== Number(session.user.id)) {
    return NextResponse.redirect(new URL(`/dashboard/socials?error=invalid_state&platform=${platform}`, req.url));
  }

  const userId = Number(session.user.id);
  const credentials = await getSocialAppCredential(userId, platform);
  if (!credentials) {
    return NextResponse.redirect(new URL(`/dashboard/socials?error=not_configured&platform=${platform}`, req.url));
  }

  try {
    const token = await exchangeCodeForToken(platform, credentials, code);
    await upsertSocialAccount({
      user_id: userId,
      platform,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_at: token.expiresAt,
      platform_username: token.platformUsername,
    });
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/dashboard/socials?error=${encodeURIComponent(err.message)}&platform=${platform}`, req.url)
    );
  }

  return NextResponse.redirect(new URL(`/dashboard/socials?connected=${platform}`, req.url));
}
