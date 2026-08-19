import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildAuthorizeUrl, ALL_PLATFORMS } from '@/lib/oauth';
import { signState } from '@/lib/oauthState';
import { getSocialAppCredential, Platform } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL('/login', req.url));

  const { platform: platformParam } = await params;
  const platform = platformParam as Platform;
  if (!ALL_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  }

  const userId = Number(session.user.id);
  const credentials = await getSocialAppCredential(userId, platform);
  if (!credentials) {
    return NextResponse.redirect(new URL(`/dashboard/socials?error=not_configured&platform=${platform}`, req.url));
  }

  const state = signState({ userId, platform, nonce: crypto.randomUUID() });
  return NextResponse.redirect(buildAuthorizeUrl(platform, credentials, state));
}
