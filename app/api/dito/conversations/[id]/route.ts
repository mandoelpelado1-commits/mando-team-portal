import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import { authOptions } from '@/lib/auth';
import {
  getDitoConversationOwner,
  getDitoMessages,
  addDitoMessage,
  touchDitoConversation,
  checkAndIncrementAiUsage,
  getDitoMemory,
  createIdea,
  logActivity,
} from '@/lib/db';
import { gatherPortalState } from '@/lib/dailyBrief';
import { MANDO_MEMORY_KEY } from '@/lib/ditoMemory';
import { notifyTeam } from '@/lib/notify';
import { pushToTeam } from '@/lib/push';

const DAILY_LIMIT = 40;
const MAX_TOOL_ROUNDS = 4;

const CREATE_IDEA_TOOL = {
  name: 'create_idea',
  description:
    "Add a new idea to the team's Ideas board, where the whole team can see and acknowledge it. Use this when the user explicitly asks you to save, add, note down, or post something as an idea. Do not use it to log ordinary conversation — only when they clearly want it saved as a team idea.",
  input_schema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'The idea text to post to the Ideas board — concise and actionable.' },
    },
    required: ['content'],
  },
};

function buildSystemPrompt(portalState: unknown, mandoMemory?: { content: string; updatedAt: string }) {
  const memoryBlock = mandoMemory
    ? `\n\nWHAT YOU ALREADY KNOW ABOUT MANDO EL PELADO (researched via web search, last refreshed ${new Date(mandoMemory.updatedAt).toISOString().slice(0, 10)} — treat this as a solid starting point, but re-search for anything time-sensitive like recent releases, current numbers, or recent news since this may be out of date):\n${mandoMemory.content}`
    : '';
  return `You are DITO, the AI assistant built into the Mando El Pelado team portal — you oversee the whole portal, not just one feature. You work for a 3-person independent artist team: an admin in the Dominican Republic, a manager in Ecuador, and the artist (Mando El Pelado) in New York. Current promo focus is Ecuador.

You have four jobs:

1. Your specialty: finding CURRENT grants, loans, and funding programs available to independent musicians and small creative businesses in ECUADOR and NEW YORK CITY, and helping the team fill out applications for them. Use web search for this — grant programs, deadlines and amounts change constantly, and your training data is not reliable for this. Never state a specific program name, deadline, or dollar amount unless you found it via search just now. If search doesn't turn up something current, say so plainly rather than guessing.

2. Know everything about Mando El Pelado that's publicly out there on the web — his music, releases, streaming numbers, socials, press coverage, playlist placements, news mentions, anything anyone would find by searching his name. Your training data on him is likely thin or stale, so use web search whenever a question touches his public presence rather than relying on memory, and check again on anything time-sensitive (recent releases, current follower counts, recent press) instead of assuming your last search is still current. If search doesn't turn up something, say so rather than guessing or inventing details.

3. General copilot for everything else in the portal — you can see the team's actual current state below (milestones, scheduled posts, ad budget, ideas, website traffic). Answer questions about it directly using these real numbers. Never invent a number that isn't in this data — if something isn't included here (e.g. specific contact details, exact post captions), say you don't have that in view and point them to the right section instead of guessing.

4. You can post directly to the team's Ideas board using the create_idea tool. Use it when the user asks you to save, add, or note something down as an idea — confirm what you posted in your reply. Don't use it just because a topic came up in conversation; only when they actually want it captured there.

You also keep track of pending portal setup work in "pendingSetup" below — features that are already built but need an API key or account connected before they go live. This is your memory of what still needs to be done. If the team asks "what's left to set up," "what do we still need to do," or anything similar, list the items where done is false, in plain language (feature + which env var to set), not just the raw field names. If they ask specifically about one (e.g. venue autocomplete, Spotify, merch), check this list first before answering.

CURRENT PORTAL STATE (JSON, fetched just now):
${JSON.stringify(portalState, null, 2)}
${memoryBlock}

Style: direct, useful, conversational. Reply in whichever language the user writes in (the team is bilingual Spanish/English). When you cite a program or fact from search, name the source so the team can verify it themselves before relying on it — application requirements and deadlines must always be double-checked on the official page.`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const owner = await getDitoConversationOwner(Number(id));
  if (owner !== Number(session.user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const messages = await getDitoMessages(Number(id));
  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sources: m.sources_json ? JSON.parse(m.sources_json) : [],
      createdAt: m.created_at,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local to talk to DITO.' },
      { status: 501 }
    );
  }

  const { id } = await params;
  const userId = Number(session.user.id);
  const owner = await getDitoConversationOwner(Number(id));
  if (owner !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const withinLimit = await checkAndIncrementAiUsage(userId, 'dito-chat', DAILY_LIMIT);
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Daily message limit reached (${DAILY_LIMIT}/day). Try again tomorrow.` },
      { status: 429 }
    );
  }

  const { message } = await req.json();
  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  await addDitoMessage(Number(id), 'user', message.trim());
  const history = await getDitoMessages(Number(id));

  try {
    const portalState = await gatherPortalState();
    const mandoMemory = await getDitoMemory(MANDO_MEMORY_KEY);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const system = buildSystemPrompt(portalState, mandoMemory);
    const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 } as any, CREATE_IDEA_TOOL as any];

    const messages: any[] = history.map((m) => ({ role: m.role, content: m.content }));
    let replyText = '';
    const sources: { title: string; url: string }[] = [];
    let ideaPosted: string | null = null;

    // Server tools (web_search) resolve inside a single call; client tools
    // (create_idea) come back as a tool_use block we must execute ourselves
    // and hand the result back before the model can finish its reply.
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system,
        messages,
        tools,
      });

      const textBlocks = response.content.filter((b: any) => b.type === 'text') as any[];
      if (textBlocks.length) replyText = textBlocks.map((b) => b.text).join('\n\n');
      for (const block of textBlocks) {
        for (const citation of block.citations || []) {
          if (citation.url && !sources.some((s) => s.url === citation.url)) {
            sources.push({ title: citation.title || citation.url, url: citation.url });
          }
        }
      }

      const toolUseBlocks = response.content.filter((b: any) => b.type === 'tool_use' && b.name === 'create_idea') as any[];
      if (toolUseBlocks.length === 0) break;

      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const tb of toolUseBlocks) {
        const content = String(tb.input?.content || '').trim().slice(0, 2000);
        if (content) {
          await createIdea(userId, content);
          await logActivity(userId, 'ideas', 'created', `${session.user.name} (via DITO) posted an idea`);
          await notifyTeam(
            userId,
            `New idea from ${session.user.name} (via DITO)`,
            `<p>${content}</p><p><a href="${process.env.APP_BASE_URL || ''}/dashboard/ideas">Acknowledge it in the portal</a></p>`
          );
          await pushToTeam(userId, { title: `💡 ${session.user.name} (via DITO)`, body: content.slice(0, 140), url: '/dashboard/ideas' });
          ideaPosted = content;
          toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: 'Idea posted to the Ideas board successfully.' });
        } else {
          toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: 'No content provided — nothing was posted.', is_error: true });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    }

    if (!replyText) replyText = "I couldn't generate a response — try rephrasing.";

    await addDitoMessage(Number(id), 'assistant', replyText, sources.length ? JSON.stringify(sources) : null);
    await touchDitoConversation(Number(id));

    return NextResponse.json({ reply: replyText, sources, ideaPosted });
  } catch (err: any) {
    return NextResponse.json({ error: `DITO failed to respond: ${err.message}` }, { status: 502 });
  }
}
