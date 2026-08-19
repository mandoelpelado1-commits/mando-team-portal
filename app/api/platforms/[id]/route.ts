import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateDspProfile, DspStatus } from '@/lib/db';

const VALID: DspStatus[] = ['not_claimed', 'pending', 'claimed', 'verified'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { status, profileUrl, externalId, notes } = await req.json();

  if (!VALID.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  await updateDspProfile(
    Number(id),
    {
      status,
      profile_url: profileUrl?.trim() || null,
      external_id: externalId?.trim() || null,
      notes: notes?.trim() || null,
    },
    Number(session.user.id)
  );
  return NextResponse.json({ ok: true });
}
