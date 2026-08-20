import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import { authOptions } from '@/lib/auth';
import { getShowById, getContactById, updateShow, checkAndIncrementAiUsage, logActivity } from '@/lib/db';

const DAILY_LIMIT = 30;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local to generate pitches.' },
      { status: 501 }
    );
  }

  const userId = Number(session.user.id);
  const withinLimit = await checkAndIncrementAiUsage(userId, 'shows-pitch', DAILY_LIMIT);
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Daily AI limit reached (${DAILY_LIMIT} pitches/day). Try again tomorrow.` },
      { status: 429 }
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const lang: 'en' | 'es' = body.lang === 'en' ? 'en' : 'es';
  const language = lang === 'es' ? 'Spanish' : 'English';

  const show = await getShowById(Number(id));
  if (!show) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const contact = show.contact_id ? await getContactById(show.contact_id) : undefined;

  const prompt = `You write booking outreach for independent reggaeton/urbano artist Mando El Pelado. Current promo focus: Ecuador, artist is based in New York.

Write a booking pitch email in ${language} for this target:
Venue: ${show.venue_name}
City/Country: ${[show.city, show.country].filter(Boolean).join(', ') || 'not specified'}
${show.capacity ? `Capacity: ${show.capacity}` : ''}
${show.target_date ? `Target date: ${show.target_date}` : ''}
${contact ? `Contact: ${contact.name}${contact.company ? ` (${contact.company})` : ''}` : ''}
${show.notes ? `Context/notes from the team: ${show.notes}` : ''}

Rules:
- Address the contact by name if given, otherwise a generic professional greeting.
- Keep it short — a promoter reads dozens of these. 3-4 short paragraphs max.
- Lead with what makes Mando bookable now (genre, current momentum), not a full biography.
- Ask for a specific next step (available dates, guarantee range, technical rider).
- Do not invent specific streaming numbers, past show attendance, or press quotes — keep claims general and truthful.
- Professional but with personality — not a form letter.

Respond with ONLY valid JSON, no markdown fences:
{"subject": "...", "body": "..."}`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content.find((b) => b.type === 'text')?.text || '{}';
    const { subject, body: pitchBody } = JSON.parse(text);
    const draft = `${subject}\n\n${pitchBody}`;

    await updateShow(show.id, { pitch_draft: draft }, userId);
    await logActivity(userId, 'shows', 'pitch_generated', `Generated pitch for ${show.venue_name}`);

    return NextResponse.json({ subject, body: pitchBody });
  } catch (err: any) {
    return NextResponse.json({ error: `Pitch generation failed: ${err.message}` }, { status: 502 });
  }
}
