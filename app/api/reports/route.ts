import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllMilestones, getAllDspProfiles } from '@/lib/db';
import { isGoogleAdsConfigured, listCampaigns } from '@/lib/googleAds';
import { isWixConfigured, getSiteAnalytics } from '@/lib/wix';
import { isPrintifyConfigured, getMerchSummary } from '@/lib/printify';
import { isSpotifyConfigured, getArtist, parseArtistId } from '@/lib/spotify';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const milestones = await getAllMilestones();
  const milestoneProgress = {
    done: milestones.filter((m) => m.status === 'done').length,
    total: milestones.length,
  };

  const dsp = await getAllDspProfiles();
  const platformsClaimed = {
    claimed: dsp.filter((p) => p.status === 'claimed' || p.status === 'verified').length,
    total: dsp.length,
  };

  let spotifyFollowers: number | null = null;
  if (isSpotifyConfigured()) {
    const spotifyEntry = dsp.find((p) => p.slug === 'spotify');
    const artistId = spotifyEntry?.external_id ? parseArtistId(spotifyEntry.external_id) : null;
    if (artistId) {
      try {
        spotifyFollowers = (await getArtist(artistId)).followers;
      } catch {
        spotifyFollowers = null;
      }
    }
  }

  let adSpend30 = 0;
  let adsAvailable = false;
  if (isGoogleAdsConfigured()) {
    try {
      const campaigns = await listCampaigns();
      adSpend30 = campaigns.reduce((s, c) => s + c.costMicros / 1_000_000, 0);
      adsAvailable = true;
    } catch {
      adsAvailable = false;
    }
  }

  let webSessions30: number | null = null;
  if (isWixConfigured()) {
    try {
      const data = await getSiteAnalytics(30);
      webSessions30 = data.find((d) => d.type === 'TOTAL_SESSIONS')?.total ?? null;
    } catch {
      webSessions30 = null;
    }
  }

  let merchRevenue30: number | null = null;
  if (isPrintifyConfigured()) {
    try {
      const summary = await getMerchSummary(process.env.PRINTIFY_SHOP_ID);
      merchRevenue30 = summary.totals.last30Revenue;
    } catch {
      merchRevenue30 = null;
    }
  }

  return NextResponse.json({
    milestoneProgress,
    platformsClaimed,
    spotifyFollowers,
    adSpend30: adsAvailable ? adSpend30 : null,
    webSessions30,
    merchRevenue30,
  });
}
