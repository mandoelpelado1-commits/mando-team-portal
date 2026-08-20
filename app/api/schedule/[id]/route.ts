import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updatePostSchedule, updatePostStatus, getPostById } from '@/lib/db';
import { syncPostToGoogleCalendar, removePostFromGoogleCalendar } from '@/lib/calendarSync';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await params;
  const postId = Number(id);
  const body = await req.json();

  if (body.scheduledFor) {
    await updatePostSchedule(postId, body.scheduledFor, 'scheduled');
    const post = await getPostById(postId);
    if (post) await syncPostToGoogleCalendar(userId, post);
  } else if (body.status === 'draft') {
    const post = await getPostById(postId);
    if (post) await removePostFromGoogleCalendar(userId, post);
    await updatePostStatus(postId, 'draft');
  }

  return NextResponse.json({ ok: true });
}
