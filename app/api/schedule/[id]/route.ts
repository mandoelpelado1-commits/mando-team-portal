import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updatePostSchedule, updatePostStatus } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const postId = Number(id);
  const body = await req.json();

  if (body.scheduledFor) {
    await updatePostSchedule(postId, body.scheduledFor, 'scheduled');
  } else if (body.status === 'draft') {
    await updatePostStatus(postId, 'draft');
  }

  return NextResponse.json({ ok: true });
}
