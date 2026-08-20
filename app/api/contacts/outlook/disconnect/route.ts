import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { disconnectOutlookAccount } from '@/lib/db';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await disconnectOutlookAccount(Number(session.user.id));
  return NextResponse.json({ ok: true });
}
