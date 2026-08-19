import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createEmailCampaignDraft, isWixEmailConfigured, wixEmailMarketingDashboardUrl } from '@/lib/wixEmail';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isWixEmailConfigured()) {
    return NextResponse.json(
      { error: 'Wix is not connected yet. Set WIX_API_KEY and WIX_SITE_ID first.' },
      { status: 501 }
    );
  }

  const { draft } = await req.json();
  if (!draft?.subject || !draft?.paragraphs?.length) {
    return NextResponse.json({ error: 'The email draft is incomplete.' }, { status: 400 });
  }

  try {
    const campaign = await createEmailCampaignDraft(draft);
    return NextResponse.json({ campaign, dashboardUrl: wixEmailMarketingDashboardUrl() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
