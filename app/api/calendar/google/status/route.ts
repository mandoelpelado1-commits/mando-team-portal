import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGoogleCalendarAccount } from '@/lib/db';
import { isGoogleCalendarConfigured } from '@/lib/googleCalendar';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const account = await getGoogleCalendarAccount(Number(session.user.id));
  return NextResponse.json({
    configured: isGoogleCalendarConfigured(),
    connected: Boolean(account),
    email: account?.email || null,
  });
}
