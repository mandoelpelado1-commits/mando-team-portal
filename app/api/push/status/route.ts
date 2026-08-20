import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPushSubscriptionsForUser } from '@/lib/db';
import { isPushConfigured } from '@/lib/push';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const configured = isPushConfigured();
  const subs = configured ? await getPushSubscriptionsForUser(Number(session.user.id)) : [];
  return NextResponse.json({
    configured,
    publicKey: configured ? process.env.VAPID_PUBLIC_KEY : null,
    subscribed: subs.length > 0,
  });
}
