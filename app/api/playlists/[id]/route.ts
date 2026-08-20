import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updatePlaylistEntry, deletePlaylistEntry, logActivity } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const fields: Record<string, unknown> = { ...body };
  if (body.songTitle !== undefined) {
    fields.song_title = body.songTitle;
    delete fields.songTitle;
  }
  if (body.dateAdded !== undefined) {
    fields.date_added = body.dateAdded || null;
    delete fields.dateAdded;
  }
  if (body.followers !== undefined) fields.followers = body.followers ? Number(body.followers) : null;

  await updatePlaylistEntry(Number(id), fields);
  if (body.status === 'added') {
    await logActivity(Number(session.user.id), 'playlists', 'added', `Playlist #${id} confirmed added`);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await deletePlaylistEntry(Number(id));
  return NextResponse.json({ ok: true });
}
