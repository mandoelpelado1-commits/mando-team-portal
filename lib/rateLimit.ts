import { NextResponse } from 'next/server';
import { checkAndIncrementAiUsage } from './db';

/**
 * Per-user, per-day cap on AI endpoints so a runaway client or accidental
 * loop can't run up the Anthropic bill unbounded. Returns a 429 response to
 * return immediately, or null if the caller is within limit.
 */
export async function enforceAiLimit(userId: number, endpoint: string, dailyLimit: number) {
  const withinLimit = await checkAndIncrementAiUsage(userId, endpoint, dailyLimit);
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Daily AI limit reached (${dailyLimit}/day for this feature). Try again tomorrow.` },
      { status: 429 }
    );
  }
  return null;
}
