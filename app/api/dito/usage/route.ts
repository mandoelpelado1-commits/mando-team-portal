import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAiUsageToday } from '@/lib/db';
import { AI_ENDPOINTS } from '@/lib/aiLimits';
import { isAnthropicAdminConfigured, getCostSummary, getUsageSummary } from '@/lib/anthropicUsage';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number(session.user.id);

  const counts = await getAiUsageToday(userId);
  const countMap = new Map(counts.map((c) => [c.endpoint, c.count]));
  const myUsageToday = AI_ENDPOINTS.map((e) => ({
    endpoint: e.endpoint,
    label_en: e.label_en,
    label_es: e.label_es,
    used: countMap.get(e.endpoint) || 0,
    limit: e.limit,
  }));

  const billingConfigured = isAnthropicAdminConfigured();
  let billing: { totalUsd: number; periodDays: number; todayUsd: number; dailyUsd: { date: string; usd: number }[] } | null = null;
  let usage: { totalInputTokens: number; totalOutputTokens: number; periodDays: number } | null = null;
  let billingError: string | null = null;

  if (billingConfigured) {
    try {
      const [cost, usageReport] = await Promise.all([getCostSummary(30), getUsageSummary(7)]);
      const today = new Date().toISOString().slice(0, 10);
      const todayUsd = cost.dailyUsd.find((d) => d.date === today)?.usd ?? cost.dailyUsd.at(-1)?.usd ?? 0;
      billing = { ...cost, todayUsd };
      usage = { totalInputTokens: usageReport.totalInputTokens, totalOutputTokens: usageReport.totalOutputTokens, periodDays: usageReport.periodDays };
    } catch (err: any) {
      billingError = err.message;
    }
  }

  return NextResponse.json({ myUsageToday, billingConfigured, billing, usage, billingError });
}
