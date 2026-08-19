import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLatestBrief, getRecentBriefs } from '@/lib/db';
import { generateDailyBrief } from '@/lib/dailyBrief';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lang = new URL(req.url).searchParams.get('lang') === 'en' ? 'en' : 'es';
  const latest = await getLatestBrief(lang);
  const recent = await getRecentBriefs(lang, 14);

  return NextResponse.json({
    latest: latest ? { date: latest.brief_date, ...JSON.parse(latest.content_json) } : null,
    history: recent.map((b) => ({ date: b.brief_date, ...JSON.parse(b.content_json) })),
    aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}

/** Manual "refresh now" — same generator the cron uses. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lang: 'en' | 'es' = body.lang === 'en' ? 'en' : 'es';

  try {
    const content = await generateDailyBrief(lang);
    return NextResponse.json({ latest: { date: new Date().toISOString().slice(0, 10), ...content } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
