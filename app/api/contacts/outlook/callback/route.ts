import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyState } from '@/lib/oauthState';
import { exchangeCodeForToken, getMyEmail } from '@/lib/microsoftGraph';
import { upsertOutlookAccount, logActivity } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL('/login', req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(new URL(`/dashboard/contacts?error=${encodeURIComponent(oauthError)}&platform=outlook`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/contacts?error=missing_code&platform=outlook', req.url));
  }

  const statePayload = verifyState(state);
  const userId = Number(session.user.id);
  if (!statePayload || statePayload.platform !== 'outlook' || statePayload.userId !== userId) {
    return NextResponse.redirect(new URL('/dashboard/contacts?error=invalid_state&platform=outlook', req.url));
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    const email = await getMyEmail(tokens.accessToken);
    await upsertOutlookAccount({
      userId,
      email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
    await logActivity(userId, 'contacts', 'connected', `Connected Outlook (${email})`);
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/dashboard/contacts?error=${encodeURIComponent(err.message)}&platform=outlook`, req.url));
  }

  return NextResponse.redirect(new URL('/dashboard/contacts?connected=outlook', req.url));
}
