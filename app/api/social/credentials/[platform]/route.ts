import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { upsertSocialAppCredential, deleteSocialAppCredential, Platform } from '@/lib/db';
import { ALL_PLATFORMS } from '@/lib/oauth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform: platformParam } = await params;
  const platform = platformParam as Platform;
  if (!ALL_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  }

  const { clientId, clientSecret } = await req.json();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Client ID and client secret are both required.' }, { status: 400 });
  }

  await upsertSocialAppCredential(Number(session.user.id), platform, clientId.trim(), clientSecret.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform } = await params;
  await deleteSocialAppCredential(Number(session.user.id), platform as Platform);
  return NextResponse.json({ ok: true });
}
