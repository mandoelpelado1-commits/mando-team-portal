import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { disconnectSocialAccount, Platform } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform } = await params;
  await disconnectSocialAccount(Number(session.user.id), platform as Platform);
  return NextResponse.json({ ok: true });
}
