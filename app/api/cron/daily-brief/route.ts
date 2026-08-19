import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBrief } from '@/lib/dailyBrief';

// Vercel Cron hits this once a day (see vercel.json).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, string> = {};
  for (const lang of ['es', 'en'] as const) {
    try {
      await generateDailyBrief(lang);
      results[lang] = 'ok';
    } catch (err: any) {
      results[lang] = `failed: ${err.message}`;
    }
  }

  return NextResponse.json({ results });
}
