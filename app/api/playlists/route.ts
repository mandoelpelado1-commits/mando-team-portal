import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllPlaylists, createPlaylistEntry, logActivity } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ playlists: await getAllPlaylists() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'Playlist name is required.' }, { status: 400 });

  const userId = Number(session.user.id);
  const id = await createPlaylistEntry({
    name: body.name,
    platform: body.platform || 'spotify',
    curator: body.curator || null,
    songTitle: body.songTitle || null,
    followers: body.followers ? Number(body.followers) : null,
    url: body.url || null,
    status: body.status || 'pitched',
    dateAdded: body.dateAdded || null,
    notes: body.notes || null,
    userId,
  });
  await logActivity(userId, 'playlists', 'created', `Logged playlist: ${body.name}`);
  return NextResponse.json({ id });
}
