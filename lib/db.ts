import { neon } from '@neondatabase/serverless';
import { encrypt, decrypt } from './crypto';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Connect the Neon database before starting the app.');
}

export const sql = neon(connectionString);

export type Role = 'admin' | 'manager' | 'artist';
export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'x';
export type MilestoneStatus = 'not_started' | 'in_progress' | 'done';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  role: Role;
  location: string;
  must_change_password: number;
  created_at: string;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const rows = (await sql`SELECT * FROM users WHERE username = ${username}`) as unknown as User[];
  return rows[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const rows = (await sql`SELECT * FROM users WHERE id = ${id}`) as unknown as User[];
  return rows[0];
}

export async function getAllUsers(): Promise<User[]> {
  return (await sql`SELECT * FROM users ORDER BY id`) as unknown as User[];
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  await sql`UPDATE users SET password_hash = ${passwordHash}, must_change_password = 0 WHERE id = ${userId}`;
}

export interface SocialAccount {
  id: number;
  user_id: number;
  platform: Platform;
  platform_username: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  connected_at: string;
}

function decryptAccount(row: SocialAccount): SocialAccount {
  return {
    ...row,
    access_token: row.access_token ? decrypt(row.access_token) : null,
    refresh_token: row.refresh_token ? decrypt(row.refresh_token) : null,
  };
}

export async function getSocialAccountsForUser(userId: number): Promise<SocialAccount[]> {
  const rows = (await sql`SELECT * FROM social_accounts WHERE user_id = ${userId}`) as unknown as SocialAccount[];
  return rows.map(decryptAccount);
}

export async function upsertSocialAccount(account: {
  user_id: number;
  platform: Platform;
  platform_username?: string | null;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
}) {
  await sql`
    INSERT INTO social_accounts (user_id, platform, platform_username, access_token, refresh_token, expires_at)
    VALUES (
      ${account.user_id},
      ${account.platform},
      ${account.platform_username ?? null},
      ${encrypt(account.access_token)},
      ${account.refresh_token ? encrypt(account.refresh_token) : null},
      ${account.expires_at ?? null}
    )
    ON CONFLICT (user_id, platform) DO UPDATE SET
      platform_username = EXCLUDED.platform_username,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      connected_at = NOW()
  `;
}

export async function disconnectSocialAccount(userId: number, platform: Platform) {
  await sql`DELETE FROM social_accounts WHERE user_id = ${userId} AND platform = ${platform}`;
}

export interface SocialAppCredentials {
  id: number;
  user_id: number;
  platform: Platform;
  client_id: string;
  client_secret_encrypted: string;
  created_at: string;
  updated_at: string;
}

export async function getSocialAppCredentialsForUser(userId: number): Promise<SocialAppCredentials[]> {
  return (await sql`SELECT * FROM social_app_credentials WHERE user_id = ${userId}`) as unknown as SocialAppCredentials[];
}

export async function getSocialAppCredential(
  userId: number,
  platform: Platform
): Promise<{ clientId: string; clientSecret: string } | undefined> {
  const rows = (await sql`
    SELECT * FROM social_app_credentials WHERE user_id = ${userId} AND platform = ${platform}
  `) as unknown as SocialAppCredentials[];
  const row = rows[0];
  if (!row) return undefined;
  return { clientId: row.client_id, clientSecret: decrypt(row.client_secret_encrypted) };
}

export async function upsertSocialAppCredential(
  userId: number,
  platform: Platform,
  clientId: string,
  clientSecret: string
) {
  await sql`
    INSERT INTO social_app_credentials (user_id, platform, client_id, client_secret_encrypted)
    VALUES (${userId}, ${platform}, ${clientId}, ${encrypt(clientSecret)})
    ON CONFLICT (user_id, platform) DO UPDATE SET
      client_id = EXCLUDED.client_id,
      client_secret_encrypted = EXCLUDED.client_secret_encrypted,
      updated_at = NOW()
  `;
}

export async function deleteSocialAppCredential(userId: number, platform: Platform) {
  await sql`DELETE FROM social_app_credentials WHERE user_id = ${userId} AND platform = ${platform}`;
}

export interface AiDraft {
  id: number;
  user_id: number;
  game_plan: string;
  tone: string | null;
  platforms: string;
  result_json: string;
  created_at: string;
}

export async function createAiDraft(draft: {
  user_id: number;
  game_plan: string;
  tone: string | null;
  platforms: string[];
  result_json: string;
}): Promise<number> {
  const rows = (await sql`
    INSERT INTO ai_drafts (user_id, game_plan, tone, platforms, result_json)
    VALUES (${draft.user_id}, ${draft.game_plan}, ${draft.tone}, ${JSON.stringify(draft.platforms)}, ${draft.result_json})
    RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export interface Post {
  id: number;
  user_id: number;
  draft_id: number | null;
  platform: Platform;
  caption: string;
  hashtags: string | null;
  scheduled_for: string | null;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  publish_error: string | null;
  media_url: string | null;
  media_type: string | null;
  link_url: string | null;
  created_at: string;
}

export async function createPost(post: {
  user_id: number;
  draft_id?: number | null;
  platform: Platform;
  caption: string;
  hashtags?: string | null;
  scheduled_for?: string | null;
  status?: Post['status'];
  media_url?: string | null;
  media_type?: string | null;
  link_url?: string | null;
}): Promise<number> {
  const rows = (await sql`
    INSERT INTO posts
      (user_id, draft_id, platform, caption, hashtags, scheduled_for, status, media_url, media_type, link_url)
    VALUES (
      ${post.user_id},
      ${post.draft_id ?? null},
      ${post.platform},
      ${post.caption},
      ${post.hashtags ?? null},
      ${post.scheduled_for ?? null},
      ${post.status ?? 'draft'},
      ${post.media_url ?? null},
      ${post.media_type ?? null},
      ${post.link_url ?? null}
    )
    RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export async function getAllPosts(): Promise<Post[]> {
  return (await sql`
    SELECT * FROM posts ORDER BY scheduled_for IS NULL, scheduled_for ASC
  `) as unknown as Post[];
}

export async function updatePostSchedule(
  postId: number,
  scheduledFor: string,
  status: Post['status'] = 'scheduled'
) {
  await sql`UPDATE posts SET scheduled_for = ${scheduledFor}, status = ${status} WHERE id = ${postId}`;
}

export async function updatePostStatus(
  postId: number,
  status: Post['status'],
  publishError: string | null = null
) {
  await sql`UPDATE posts SET status = ${status}, publish_error = ${publishError} WHERE id = ${postId}`;
}

export async function getPostsDueForPublish(nowIso: string): Promise<Post[]> {
  return (await sql`
    SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_for <= ${nowIso}
  `) as unknown as Post[];
}

export interface BudgetChangeRequest {
  id: number;
  campaign_id: string;
  campaign_name: string;
  current_budget_micros: number;
  proposed_budget_micros: number;
  reason: string | null;
  requested_by: number;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'apply_failed';
  approved_by: number | null;
  created_at: string;
  resolved_at: string | null;
}

export async function createBudgetChangeRequest(req: {
  campaign_id: string;
  campaign_name: string;
  current_budget_micros: number;
  proposed_budget_micros: number;
  reason?: string | null;
  requested_by: number;
}): Promise<number> {
  const rows = (await sql`
    INSERT INTO budget_change_requests
      (campaign_id, campaign_name, current_budget_micros, proposed_budget_micros, reason, requested_by)
    VALUES (
      ${req.campaign_id}, ${req.campaign_name}, ${req.current_budget_micros},
      ${req.proposed_budget_micros}, ${req.reason ?? null}, ${req.requested_by}
    )
    RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export async function getBudgetChangeRequests(): Promise<BudgetChangeRequest[]> {
  return (await sql`
    SELECT * FROM budget_change_requests ORDER BY created_at DESC
  `) as unknown as BudgetChangeRequest[];
}

export async function getBudgetChangeRequestById(id: number): Promise<BudgetChangeRequest | undefined> {
  const rows = (await sql`SELECT * FROM budget_change_requests WHERE id = ${id}`) as unknown as BudgetChangeRequest[];
  return rows[0];
}

export async function resolveBudgetChangeRequest(
  id: number,
  status: 'approved' | 'rejected' | 'applied' | 'apply_failed',
  approvedBy: number | null
) {
  await sql`
    UPDATE budget_change_requests
    SET status = ${status}, approved_by = ${approvedBy}, resolved_at = NOW()
    WHERE id = ${id}
  `;
}

export interface Idea {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
}

export async function createIdea(userId: number, content: string): Promise<number> {
  const rows = (await sql`
    INSERT INTO ideas (user_id, content) VALUES (${userId}, ${content}) RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export async function getAllIdeas(): Promise<Idea[]> {
  return (await sql`SELECT * FROM ideas ORDER BY created_at DESC`) as unknown as Idea[];
}

export interface IdeaAcknowledgment {
  id: number;
  idea_id: number;
  user_id: number;
  acknowledged_at: string;
}

export async function getAllIdeaAcknowledgments(): Promise<IdeaAcknowledgment[]> {
  return (await sql`SELECT * FROM idea_acknowledgments`) as unknown as IdeaAcknowledgment[];
}

export async function acknowledgeIdea(ideaId: number, userId: number) {
  await sql`
    INSERT INTO idea_acknowledgments (idea_id, user_id)
    VALUES (${ideaId}, ${userId})
    ON CONFLICT (idea_id, user_id) DO NOTHING
  `;
}

export interface Milestone {
  id: number;
  slug: string;
  category: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  priority: 'high' | 'medium' | 'low';
  status: MilestoneStatus;
  notes: string | null;
  updated_by: number | null;
  updated_at: string | null;
  sort_order: number;
}

export async function getAllMilestones(): Promise<Milestone[]> {
  return (await sql`SELECT * FROM milestones ORDER BY sort_order, id`) as unknown as Milestone[];
}

export async function getMilestoneById(id: number): Promise<Milestone | undefined> {
  const rows = (await sql`SELECT * FROM milestones WHERE id = ${id}`) as unknown as Milestone[];
  return rows[0];
}

export async function updateMilestone(
  id: number,
  status: MilestoneStatus,
  notes: string | null,
  userId: number
) {
  await sql`
    UPDATE milestones
    SET status = ${status}, notes = ${notes}, updated_by = ${userId}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function getMilestoneGuide(milestoneId: number, lang: 'en' | 'es'): Promise<string | undefined> {
  const rows = (await sql`
    SELECT guide_json FROM milestone_guides WHERE milestone_id = ${milestoneId} AND lang = ${lang}
  `) as unknown as { guide_json: string }[];
  return rows[0]?.guide_json;
}

export async function saveMilestoneGuide(milestoneId: number, lang: 'en' | 'es', guideJson: string) {
  await sql`
    INSERT INTO milestone_guides (milestone_id, lang, guide_json)
    VALUES (${milestoneId}, ${lang}, ${guideJson})
    ON CONFLICT (milestone_id, lang) DO UPDATE SET
      guide_json = EXCLUDED.guide_json,
      generated_at = NOW()
  `;
}

export interface DailyBrief {
  id: number;
  brief_date: string;
  lang: 'en' | 'es';
  content_json: string;
  created_at: string;
}

export async function getLatestBrief(lang: 'en' | 'es'): Promise<DailyBrief | undefined> {
  const rows = (await sql`
    SELECT * FROM daily_briefs WHERE lang = ${lang} ORDER BY brief_date DESC LIMIT 1
  `) as unknown as DailyBrief[];
  return rows[0];
}

export async function getRecentBriefs(lang: 'en' | 'es', limit = 14): Promise<DailyBrief[]> {
  return (await sql`
    SELECT * FROM daily_briefs WHERE lang = ${lang} ORDER BY brief_date DESC LIMIT ${limit}
  `) as unknown as DailyBrief[];
}

export async function saveDailyBrief(briefDate: string, lang: 'en' | 'es', contentJson: string) {
  await sql`
    INSERT INTO daily_briefs (brief_date, lang, content_json)
    VALUES (${briefDate}, ${lang}, ${contentJson})
    ON CONFLICT (brief_date, lang) DO UPDATE SET
      content_json = EXCLUDED.content_json,
      created_at = NOW()
  `;
}

export type DspStatus = 'not_claimed' | 'pending' | 'claimed' | 'verified';

export interface DspProfile {
  id: number;
  slug: string;
  name: string;
  category: 'streaming' | 'video' | 'discovery' | 'dashboard' | 'royalties';
  manage_url: string;
  note_en: string;
  note_es: string;
  auto_metrics: boolean;
  status: DspStatus;
  profile_url: string | null;
  external_id: string | null;
  followers: number | null;
  popularity: number | null;
  metrics_updated_at: string | null;
  notes: string | null;
  updated_by: number | null;
  updated_at: string | null;
  sort_order: number;
}

export async function getAllDspProfiles(): Promise<DspProfile[]> {
  return (await sql`SELECT * FROM dsp_profiles ORDER BY sort_order, id`) as unknown as DspProfile[];
}

export async function getDspProfileById(id: number): Promise<DspProfile | undefined> {
  const rows = (await sql`SELECT * FROM dsp_profiles WHERE id = ${id}`) as unknown as DspProfile[];
  return rows[0];
}

export async function updateDspProfile(
  id: number,
  fields: { status: DspStatus; profile_url: string | null; external_id: string | null; notes: string | null },
  userId: number
) {
  await sql`
    UPDATE dsp_profiles
    SET status = ${fields.status},
        profile_url = ${fields.profile_url},
        external_id = ${fields.external_id},
        notes = ${fields.notes},
        updated_by = ${userId},
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function updateDspMetrics(id: number, followers: number, popularity: number) {
  await sql`
    UPDATE dsp_profiles
    SET followers = ${followers}, popularity = ${popularity}, metrics_updated_at = NOW()
    WHERE id = ${id}
  `;
}
