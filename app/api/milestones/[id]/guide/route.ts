import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import { authOptions } from '@/lib/auth';
import { getMilestoneById, getMilestoneGuide, saveMilestoneGuide } from '@/lib/db';
import { enforceAiLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const lang = new URL(req.url).searchParams.get('lang') === 'en' ? 'en' : 'es';
  const cached = await getMilestoneGuide(Number(id), lang);

  return NextResponse.json({ guide: cached ? JSON.parse(cached) : null });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = await enforceAiLimit(Number(session.user.id), 'milestone-guide', 30);
  if (limited) return limited;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local to generate guides.' },
      { status: 501 }
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const lang: 'en' | 'es' = body.lang === 'en' ? 'en' : 'es';

  const milestone = await getMilestoneById(Number(id));
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const language = lang === 'es' ? 'Spanish' : 'English';
  const title = lang === 'es' ? milestone.title_es : milestone.title_en;
  const description = lang === 'es' ? milestone.description_es : milestone.description_en;

  const prompt = `You advise the team behind Mando El Pelado, an independent reggaeton/urbano artist. The team is 3 people: a manager in Ecuador, an admin in the Dominican Republic, and the artist in New York. Current promo focus is Ecuador. Assume a modest independent budget, not label money.

Career milestone they need to accomplish:
TITLE: ${title}
CONTEXT: ${description}

Write a practical action guide in ${language}.

Important accuracy rules:
- Give realistic budget RANGES in USD, not false precision. If something is genuinely free, say it is free.
- Registration fees and requirements change — for any figure, note it should be verified on the official site before paying.
- If a step legally or practically requires a professional (lawyer, accountant), say so plainly rather than implying they can DIY it.
- If something commonly goes wrong or is a known trap for independent artists, put it in pitfalls.
- Do not invent specific contact names, email addresses, or URLs you are not certain about. Refer to organizations by name instead.

Respond with ONLY valid JSON, no markdown fences, no commentary:
{
  "summary": "2-3 sentence plain-language explanation of what this is and why it matters for Mando specifically",
  "budgetLow": 0,
  "budgetHigh": 0,
  "budgetNote": "one line explaining what drives the cost, and that figures need verifying",
  "timeline": "realistic time estimate, e.g. '1-2 weeks' or '3-6 months'",
  "steps": [
    {"title": "short step title", "detail": "what to actually do", "who": "who on the team should own this"}
  ],
  "pitfalls": ["common mistake or trap", "another one"],
  "doneWhen": "one sentence describing how they know this milestone is genuinely complete"
}

Give 4-7 steps. Be concrete and specific to an independent Latin artist, not generic advice.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content.find((b) => b.type === 'text')?.text || '{}';
    const guide = JSON.parse(text);
    await saveMilestoneGuide(Number(id), lang, JSON.stringify(guide));
    return NextResponse.json({ guide });
  } catch (err: any) {
    return NextResponse.json({ error: `Guide generation failed: ${err.message}` }, { status: 502 });
  }
}
