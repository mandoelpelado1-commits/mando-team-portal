import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import { authOptions } from '@/lib/auth';
import { getDitoMemory, setDitoMemory, logActivity } from '@/lib/db';
import { enforceAiLimit } from '@/lib/rateLimit';
import { MANDO_MEMORY_KEY, MANDO_MEMORY_REFRESH_PROMPT } from '@/lib/ditoMemory';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const memory = await getDitoMemory(MANDO_MEMORY_KEY);
  return NextResponse.json({ memory: memory || null });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number(session.user.id);

  // This does several searches per call — cap it as an occasional maintenance
  // action, not something to spam.
  const limited = await enforceAiLimit(userId, 'dito-memory-refresh', 3);
  if (limited) return limited;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set.' }, { status: 501 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: MANDO_MEMORY_REFRESH_PROMPT }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 } as any],
    });

    const textBlocks = response.content.filter((b: any) => b.type === 'text') as any[];
    const content = textBlocks.map((b) => b.text).join('\n\n').trim();
    if (!content) return NextResponse.json({ error: 'Research came back empty — try again.' }, { status: 502 });

    await setDitoMemory(MANDO_MEMORY_KEY, content);
    await logActivity(userId, 'dito', 'memory_refreshed', "Refreshed DITO's research on Mando El Pelado");

    const memory = await getDitoMemory(MANDO_MEMORY_KEY);
    return NextResponse.json({ memory });
  } catch (err: any) {
    return NextResponse.json({ error: `Refresh failed: ${err.message}` }, { status: 502 });
  }
}
