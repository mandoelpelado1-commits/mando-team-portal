import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI email writing.' },
      { status: 501 }
    );
  }

  const { topic, language } = await req.json();
  if (!topic || !topic.trim()) {
    return NextResponse.json({ error: 'Tell us what the email is about.' }, { status: 400 });
  }

  const lang = language === 'es' ? 'Spanish' : 'English';

  const prompt = `You write email blasts for reggaeton/urbano artist Mando El Pelado. Promo focus: Ecuador.

What this email is about: ${topic}

Write a complete email blast in ${lang}. Keep it warm, direct, and fan-facing. Short paragraphs — this is a marketing email, not an essay.

Respond with ONLY valid JSON, no markdown fences, no commentary:
{"subject": "...", "preheader": "...", "greeting": "...", "paragraphs": ["...", "..."], "signOff": "..."}

- subject: under 60 characters, punchy
- preheader: one short line that appears after the subject in the inbox
- greeting: e.g. a greeting line to the fans
- paragraphs: 2-4 short paragraphs
- signOff: closing line`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content.find((b) => b.type === 'text')?.text || '{}';
    const draft = JSON.parse(text);
    return NextResponse.json({ draft });
  } catch (err: any) {
    return NextResponse.json({ error: `AI generation failed: ${err.message}` }, { status: 502 });
  }
}
