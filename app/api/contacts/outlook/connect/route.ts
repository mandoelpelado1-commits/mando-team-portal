import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildAuthorizeUrl, isMicrosoftConfigured } from '@/lib/microsoftGraph';
import { signState } from '@/lib/oauthState';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL('/login', req.url));

  if (!isMicrosoftConfigured()) {
    return NextResponse.redirect(new URL('/dashboard/contacts?error=not_configured&platform=outlook', req.url));
  }

  const state = signState({ userId: Number(session.user.id), platform: 'outlook', nonce: crypto.randomUUID() });
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
