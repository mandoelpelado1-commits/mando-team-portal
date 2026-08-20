import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildAuthorizeUrl, isGoogleCalendarConfigured } from '@/lib/googleCalendar';
import { signState } from '@/lib/oauthState';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL('/login', req.url));

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(new URL('/dashboard/schedule?error=not_configured&platform=google_calendar', req.url));
  }

  const state = signState({ userId: Number(session.user.id), platform: 'google_calendar', nonce: crypto.randomUUID() });
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
