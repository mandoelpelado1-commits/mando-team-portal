import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pushToUser, isPushConfigured } from '@/lib/push';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isPushConfigured()) return NextResponse.json({ error: 'Push is not configured.' }, { status: 501 });

  await pushToUser(Number(session.user.id), {
    title: 'Mando El Pelado Portal',
    body: 'Notifications are working — you\'ll get these for new ideas and things that need attention.',
    url: '/dashboard',
  });
  return NextResponse.json({ ok: true });
}
