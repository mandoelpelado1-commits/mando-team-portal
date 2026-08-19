import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllDspProfiles, getAllUsers } from '@/lib/db';
import { isSpotifyConfigured } from '@/lib/spotify';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = new Map((await getAllUsers()).map((u) => [u.id, u.display_name]));
  const platforms = (await getAllDspProfiles()).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    manageUrl: p.manage_url,
    note_en: p.note_en,
    note_es: p.note_es,
    autoMetrics: p.auto_metrics,
    status: p.status,
    profileUrl: p.profile_url,
    externalId: p.external_id,
    followers: p.followers,
    popularity: p.popularity,
    metricsUpdatedAt: p.metrics_updated_at,
    notes: p.notes,
    updatedBy: p.updated_by ? users.get(p.updated_by) || null : null,
    updatedAt: p.updated_at,
  }));

  return NextResponse.json({ platforms, spotifyConfigured: isSpotifyConfigured() });
}
