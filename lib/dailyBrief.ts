import Anthropic from '@anthropic-ai/sdk';
import {
  getAllMilestones,
  getAllPosts,
  getBudgetChangeRequests,
  getAllIdeas,
  getAllIdeaAcknowledgments,
  getAllUsers,
  saveDailyBrief,
} from './db';
import { isGoogleAdsConfigured, listCampaigns } from './googleAds';
import { isWixConfigured, getSiteAnalytics } from './wix';
import { isGooglePlacesConfigured } from './googlePlaces';

export interface BriefContent {
  headline: string;
  budget: string;
  attention: string[];
  tip: string;
}

/** Snapshot of everything actually happening in the portal right now. */
export async function gatherPortalState() {
  const milestones = await getAllMilestones();
  const posts = await getAllPosts();
  const budgetRequests = await getBudgetChangeRequests();
  const ideas = await getAllIdeas();
  const acks = await getAllIdeaAcknowledgments();
  const teamSize = (await getAllUsers()).length;

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const ackCounts = new Map<number, number>();
  for (const a of acks) ackCounts.set(a.idea_id, (ackCounts.get(a.idea_id) || 0) + 1);

  let ads: { name: string; budget: number; spend: number }[] = [];
  let adsError: string | null = null;
  if (isGoogleAdsConfigured()) {
    try {
      ads = (await listCampaigns()).map((c) => ({
        name: c.name,
        budget: c.budgetMicros / 1_000_000,
        spend: c.costMicros / 1_000_000,
      }));
    } catch (err: any) {
      adsError = err.message;
    }
  }

  let webSessions: number | null = null;
  if (isWixConfigured()) {
    try {
      const data = await getSiteAnalytics(30);
      webSessions = data.find((d) => d.type === 'TOTAL_SESSIONS')?.total ?? null;
    } catch {
      webSessions = null;
    }
  }

  return {
    teamSize,
    milestones: {
      total: milestones.length,
      done: milestones.filter((m) => m.status === 'done').length,
      inProgress: milestones.filter((m) => m.status === 'in_progress').map((m) => m.title_en),
      highPriorityNotStarted: milestones
        .filter((m) => m.status === 'not_started' && m.priority === 'high')
        .map((m) => m.title_en),
    },
    posts: {
      drafts: posts.filter((p) => p.status === 'draft').length,
      scheduledNext7Days: posts.filter(
        (p) =>
          p.status === 'scheduled' &&
          p.scheduled_for &&
          new Date(p.scheduled_for) >= now &&
          new Date(p.scheduled_for) <= weekAhead
      ).length,
      failed: posts.filter((p) => p.status === 'failed').length,
    },
    budget: {
      pendingApprovals: budgetRequests.filter((r) => r.status === 'pending').length,
      appliedLast30Days: budgetRequests.filter(
        (r) => r.status === 'applied' && r.resolved_at && new Date(r.resolved_at) >= new Date(now.getTime() - 30 * 864e5)
      ).length,
      ads,
      adsError,
      adsConfigured: isGoogleAdsConfigured(),
    },
    ideas: {
      total: ideas.length,
      awaitingAcknowledgment: ideas.filter((i) => (ackCounts.get(i.id) || 0) < teamSize).length,
    },
    website: { sessionsLast30Days: webSessions, configured: isWixConfigured() },
    // Pending setup work — DITO's running todo list of integrations the team
    // hasn't activated yet. Each is a real env var check, not a stored note,
    // so it's always accurate and never goes stale.
    pendingSetup: [
      { feature: 'AI post generator, email writer, DITO chat, milestone/booking AI guides', envVar: 'ANTHROPIC_API_KEY', done: Boolean(process.env.ANTHROPIC_API_KEY) },
      { feature: 'Email notifications for budget requests and new ideas', envVar: 'RESEND_API_KEY + RESEND_FROM_EMAIL', done: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) },
      { feature: 'Spotify follower/popularity tracking', envVar: 'SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET', done: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) },
      { feature: 'Printify pop-up merch store', envVar: 'PRINTIFY_API_TOKEN + PRINTIFY_SHOP_ID', done: Boolean(process.env.PRINTIFY_API_TOKEN && process.env.PRINTIFY_SHOP_ID) },
      { feature: 'Wix site analytics + email blast sending', envVar: 'WIX_API_KEY + WIX_SITE_ID', done: isWixConfigured() },
      { feature: 'Google Ads shared account budget/spend', envVar: 'GOOGLE_ADS_CLIENT_ID/SECRET/REFRESH_TOKEN/DEVELOPER_TOKEN/CUSTOMER_ID', done: isGoogleAdsConfigured() },
      { feature: 'Venue autocomplete on Shows & Booking (type a venue, pick from a dropdown like Google)', envVar: 'GOOGLE_PLACES_API_KEY', done: isGooglePlacesConfigured() },
      { feature: 'Connect Outlook (any Microsoft 365 mailbox, incl. GoDaddy-hosted) to import contacts', envVar: 'MICROSOFT_CLIENT_ID + MICROSOFT_CLIENT_SECRET', done: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) },
      { feature: 'Google Calendar sync for the Weekly Schedule', envVar: 'GOOGLE_CALENDAR_CLIENT_ID + GOOGLE_CALENDAR_CLIENT_SECRET', done: Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET) },
      { feature: 'Phone push notifications (new ideas, pending budget approvals, daily digest)', envVar: 'VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY', done: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) },
      { feature: 'Anthropic billing panel on the DITO page', envVar: 'ANTHROPIC_ADMIN_API_KEY', done: Boolean(process.env.ANTHROPIC_ADMIN_API_KEY) },
    ],
  };
}

export async function generateDailyBrief(lang: 'en' | 'es'): Promise<BriefContent> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set.');

  const state = await gatherPortalState();
  const language = lang === 'es' ? 'Spanish' : 'English';

  const prompt = `You write a short daily brief for the 3-person team managing independent reggaeton/urbano artist Mando El Pelado. Promo focus: Ecuador. Modest independent budget.

Here is the ACTUAL current state of their portal (JSON):
${JSON.stringify(state, null, 2)}

Write today's brief in ${language}.

Rules:
- Only reference what is actually in the data above. Never invent numbers, campaigns, or events.
- If ads or website analytics are not configured, do not pretend to have that data — you may note it as a gap.
- Be direct and useful, like a sharp manager, not a cheerleader. No filler praise.
- The budget line should be honest: if there is no ad data, say that plainly instead of guessing.
- The tip should be ONE specific, actionable thing worth doing today, ideally tied to their biggest current gap.

Respond with ONLY valid JSON, no markdown fences:
{
  "headline": "one sentence summarizing where things stand today",
  "budget": "1-2 sentences on ad budget/spend status specifically",
  "attention": ["thing needing attention", "another"],
  "tip": "one specific actionable suggestion for today"
}

Keep "attention" to 2-4 items. If nothing needs attention, return an empty array rather than inventing items.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content.find((b) => b.type === 'text')?.text || '{}';
  const content = JSON.parse(text) as BriefContent;

  const today = new Date().toISOString().slice(0, 10);
  await saveDailyBrief(today, lang, JSON.stringify(content));

  return content;
}
