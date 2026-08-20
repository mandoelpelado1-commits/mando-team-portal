import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import { authOptions } from '@/lib/auth';
import { createAiDraft, createPost, Platform } from '@/lib/db';
import { enforceAiLimit } from '@/lib/rateLimit';

interface GeneratedPost {
  platform: Platform;
  caption: string;
  hashtags: string[];
  suggested_day: string;
  suggested_time: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = await enforceAiLimit(Number(session.user.id), 'generate-posts', 30);
  if (limited) return limited;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local to enable the AI post generator.' },
      { status: 501 }
    );
  }

  const body = await req.json();
  const gamePlan: string = body.gamePlan;
  const tone: string = body.tone || 'confident, high-energy';
  const platforms: Platform[] = body.platforms || [];
  const mediaType: string | null = body.mediaType || null;
  const mediaUrl: string | null = body.mediaUrl || null;
  const linkUrl: string | null = body.linkUrl || null;
  const language: string = body.language === 'en' ? 'English' : 'Spanish';

  if (!gamePlan || platforms.length === 0) {
    return NextResponse.json({ error: 'gamePlan and at least one platform are required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Tell the model what's actually attached so captions match the post,
  // and so it handles the platforms that don't support clickable links.
  const attachmentContext = [
    mediaType === 'video'
      ? 'A VIDEO is attached to this post. Write captions that suit video — hooks in the first line, a reason to watch.'
      : mediaType === 'image'
      ? 'An IMAGE is attached to this post. Write captions that complement a still image.'
      : 'No media is attached — the caption has to carry the post on its own.',
    linkUrl
      ? `A link is attached: ${linkUrl}
- On platforms where links are clickable in the caption (Facebook, X, YouTube), include it naturally.
- On Instagram and TikTok links are NOT clickable in captions — say "link in bio" instead of pasting the URL.`
      : 'No link attached — do not invent one or say "link in bio".',
  ].join('\n');

  const prompt = `You are the social media strategist for reggaeton/urbano artist Mando El Pelado, promo focus Ecuador.

Game plan for this campaign: ${gamePlan}
Tone: ${tone}
Platforms to write for: ${platforms.join(', ')}
Write the captions in ${language}.

${attachmentContext}

For each platform, write a platform-appropriate caption (respect platform norms/length), 5-8 relevant hashtags, and a suggested day of week + time (Ecuador time, GMT-5) to post for maximum engagement.

Respond with ONLY valid JSON matching this shape, no markdown fences, no commentary:
{"posts": [{"platform": "instagram", "caption": "...", "hashtags": ["..."], "suggested_day": "Friday", "suggested_time": "18:00"}]}`;

  let posts: GeneratedPost[];
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content.find((b) => b.type === 'text')?.text || '{}';
    const parsed = JSON.parse(text);
    posts = parsed.posts;
  } catch (err: any) {
    return NextResponse.json({ error: `AI generation failed: ${err.message}` }, { status: 502 });
  }

  const userId = Number(session.user.id);
  const draftId = await createAiDraft({
    user_id: userId,
    game_plan: gamePlan,
    tone,
    platforms,
    result_json: JSON.stringify(posts),
  });

  const createdPostIds = await Promise.all(
    posts.map((p) =>
      createPost({
        user_id: userId,
        draft_id: draftId,
        platform: p.platform,
        caption: p.caption,
        hashtags: p.hashtags.join(', '),
        status: 'draft',
        media_url: mediaUrl,
        media_type: mediaType,
        link_url: linkUrl,
      })
    )
  );

  return NextResponse.json({ draftId, posts, postIds: createdPostIds });
}
