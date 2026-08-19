import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDspProfileById, updateDspMetrics } from '@/lib/db';
import { isSpotifyConfigured, getArtist, parseArtistId } from '@/lib/spotify';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const profile = await getDspProfileById(Number(id));
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (profile.slug !== 'spotify') {
    return NextResponse.json(
      { error: 'Automatic metrics are only available for Spotify right now.' },
      { status: 400 }
    );
  }
  if (!isSpotifyConfigured()) {
    return NextResponse.json(
      { error: 'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to pull live numbers.' },
      { status: 501 }
    );
  }

  const artistId = parseArtistId(profile.external_id || '');
  if (!artistId) {
    return NextResponse.json(
      { error: 'Add the Spotify artist ID or profile URL first.' },
      { status: 400 }
    );
  }

  try {
    const artist = await getArtist(artistId);
    await updateDspMetrics(profile.id, artist.followers, artist.popularity);
    return NextResponse.json({ ok: true, artist });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
