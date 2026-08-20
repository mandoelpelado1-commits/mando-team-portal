import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBrief, BriefContent } from '@/lib/dailyBrief';
import { pushToEveryone } from '@/lib/push';

// Vercel Cron hits this once a day (see vercel.json).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, string> = {};
  let esBrief: BriefContent | null = null;
  for (const lang of ['es', 'en'] as const) {
    try {
      const brief = await generateDailyBrief(lang);
      if (lang === 'es') esBrief = brief;
      results[lang] = 'ok';
    } catch (err: any) {
      results[lang] = `failed: ${err.message}`;
    }
  }

  // Push a digest of what still needs attention — the team is bilingual but
  // a device subscription isn't tied to a language, so this uses the
  // Spanish brief (the team's shared working language) for the single push.
  if (esBrief && esBrief.attention.length > 0) {
    await pushToEveryone({
      title: '☀️ Resumen del día',
      body: esBrief.attention.slice(0, 3).join(' · ').slice(0, 180),
      url: '/dashboard',
    });
  }

  return NextResponse.json({ results });
}
