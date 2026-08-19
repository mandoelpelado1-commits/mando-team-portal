import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isGoogleAdsConfigured, listCampaigns } from '@/lib/googleAds';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ configured: false, campaigns: [] });
  }

  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ configured: true, campaigns });
  } catch (err: any) {
    return NextResponse.json({ configured: true, campaigns: [], error: err.message }, { status: 502 });
  }
}
