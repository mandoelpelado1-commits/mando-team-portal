import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyState } from '@/lib/oauthState';
import { exchangeCodeForToken, getMyEmail } from '@/lib/googleCalendar';
import { upsertGoogleCalendarAccount, logActivity } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL('/login', req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(new URL(`/dashboard/schedule?error=${encodeURIComponent(oauthError)}&platform=google_calendar`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/schedule?error=missing_code&platform=google_calendar', req.url));
  }

  const statePayload = verifyState(state);
  const userId = Number(session.user.id);
  if (!statePayload || statePayload.platform !== 'google_calendar' || statePayload.userId !== userId) {
    return NextResponse.redirect(new URL('/dashboard/schedule?error=invalid_state&platform=google_calendar', req.url));
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    if (!tokens.refreshToken) {
      // Google only sends a refresh token on first consent for this app; if the
      // user previously connected and revoked without disconnecting here first,
      // force them through consent again so we get one.
      return NextResponse.redirect(
        new URL('/dashboard/schedule?error=no_refresh_token_reconnect&platform=google_calendar', req.url)
      );
    }
    const email = await getMyEmail(tokens.accessToken);
    await upsertGoogleCalendarAccount({
      userId,
      email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
    await logActivity(userId, 'schedule', 'connected', `Connected Google Calendar (${email})`);
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/dashboard/schedule?error=${encodeURIComponent(err.message)}&platform=google_calendar`, req.url));
  }

  return NextResponse.redirect(new URL('/dashboard/schedule?connected=google_calendar', req.url));
}
