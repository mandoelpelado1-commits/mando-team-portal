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
  active: boolean;
  totp_secret: string | null;
  totp_enabled: boolean;
  email: string | null;
  avatar_url: string | null;
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

/**
 * Every team member's connection status, for the shared "who's connected to
 * what" view. Deliberately does NOT decrypt or return tokens — this is meant
 * to be visible to the whole team, credentials never are.
 */
export async function getAllSocialAccountsStatus(): Promise<
  Pick<SocialAccount, 'user_id' | 'platform' | 'platform_username' | 'connected_at'>[]
> {
  return (await sql`
    SELECT user_id, platform, platform_username, connected_at FROM social_accounts
  `) as unknown as Pick<SocialAccount, 'user_id' | 'platform' | 'platform_username' | 'connected_at'>[];
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
  google_event_id: string | null;
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

export async function getPostById(id: number): Promise<Post | undefined> {
  const rows = (await sql`SELECT * FROM posts WHERE id = ${id}`) as unknown as Post[];
  return rows[0];
}

export async function updatePostSchedule(
  postId: number,
  scheduledFor: string,
  status: Post['status'] = 'scheduled'
) {
  await sql`UPDATE posts SET scheduled_for = ${scheduledFor}, status = ${status} WHERE id = ${postId}`;
}

export async function setPostGoogleEventId(postId: number, googleEventId: string | null) {
  await sql`UPDATE posts SET google_event_id = ${googleEventId} WHERE id = ${postId}`;
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

// --- Contacts / CRM ---
export type ContactType = 'venue' | 'promoter' | 'press' | 'sync' | 'curator' | 'other';
export type ContactStatus = 'new' | 'contacted' | 'responded' | 'negotiating' | 'confirmed' | 'passed' | 'dead';

export interface Contact {
  id: number;
  name: string;
  type: ContactType;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  status: ContactStatus;
  notes: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export async function getAllContacts(): Promise<Contact[]> {
  return (await sql`SELECT * FROM contacts ORDER BY updated_at DESC`) as unknown as Contact[];
}

export async function getContactById(id: number): Promise<Contact | undefined> {
  const rows = (await sql`SELECT * FROM contacts WHERE id = ${id}`) as unknown as Contact[];
  return rows[0];
}

export async function createContact(c: {
  name: string;
  type: ContactType;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
  userId: number;
}): Promise<number> {
  const rows = (await sql`
    INSERT INTO contacts (name, type, company, email, phone, city, country, notes, created_by, updated_by)
    VALUES (${c.name}, ${c.type}, ${c.company ?? null}, ${c.email ?? null}, ${c.phone ?? null},
            ${c.city ?? null}, ${c.country ?? null}, ${c.notes ?? null}, ${c.userId}, ${c.userId})
    RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export async function updateContact(
  id: number,
  fields: Partial<Pick<Contact, 'name' | 'type' | 'company' | 'email' | 'phone' | 'city' | 'country' | 'status' | 'notes'>>,
  userId: number
) {
  const current = await getContactById(id);
  if (!current) return;
  const merged = { ...current, ...fields };
  await sql`
    UPDATE contacts SET
      name = ${merged.name}, type = ${merged.type}, company = ${merged.company},
      email = ${merged.email}, phone = ${merged.phone}, city = ${merged.city}, country = ${merged.country},
      status = ${merged.status}, notes = ${merged.notes}, updated_by = ${userId}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

// --- Mando Avispate (personal goals for Mando, separate from company work) ---
export type MandoGoalStatus = 'not_started' | 'in_progress' | 'done';

export interface MandoGoal {
  id: number;
  title: string;
  notes: string | null;
  status: MandoGoalStatus;
  due_date: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

export async function getAllMandoGoals(): Promise<MandoGoal[]> {
  return (await sql`
    SELECT * FROM mando_goals
    ORDER BY (status = 'done') ASC, sort_order ASC, created_at ASC
  `) as unknown as MandoGoal[];
}

export async function createMandoGoal(g: {
  title: string;
  notes?: string | null;
  dueDate?: string | null;
  userId: number;
}): Promise<number> {
  const rows = (await sql`
    INSERT INTO mando_goals (title, notes, due_date, created_by, updated_by)
    VALUES (${g.title}, ${g.notes ?? null}, ${g.dueDate ?? null}, ${g.userId}, ${g.userId})
    RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export async function updateMandoGoal(
  id: number,
  fields: Partial<Pick<MandoGoal, 'title' | 'notes' | 'status' | 'due_date'>>,
  userId: number
) {
  const rows = (await sql`SELECT * FROM mando_goals WHERE id = ${id}`) as unknown as MandoGoal[];
  const current = rows[0];
  if (!current) return;
  const merged = { ...current, ...fields };
  await sql`
    UPDATE mando_goals SET
      title = ${merged.title}, notes = ${merged.notes}, status = ${merged.status},
      due_date = ${merged.due_date}, updated_by = ${userId}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deleteMandoGoal(id: number) {
  await sql`DELETE FROM mando_goals WHERE id = ${id}`;
}

// --- Shows / booking pipeline ---
export type ShowStatus = 'prospecting' | 'pitched' | 'negotiating' | 'confirmed' | 'completed' | 'cancelled';

export interface Show {
  id: number;
  contact_id: number | null;
  venue_name: string;
  city: string | null;
  country: string | null;
  target_date: string | null;
  capacity: number | null;
  fee_offered: number | null;
  status: ShowStatus;
  notes: string | null;
  pitch_draft: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export async function getAllShows(): Promise<Show[]> {
  return (await sql`SELECT * FROM shows ORDER BY updated_at DESC`) as unknown as Show[];
}

export async function getShowById(id: number): Promise<Show | undefined> {
  const rows = (await sql`SELECT * FROM shows WHERE id = ${id}`) as unknown as Show[];
  return rows[0];
}

export async function createShow(s: {
  venueName: string;
  city?: string | null;
  country?: string | null;
  targetDate?: string | null;
  capacity?: number | null;
  feeOffered?: number | null;
  contactId?: number | null;
  notes?: string | null;
  userId: number;
}): Promise<number> {
  const rows = (await sql`
    INSERT INTO shows (venue_name, city, country, target_date, capacity, fee_offered, contact_id, notes, created_by, updated_by)
    VALUES (${s.venueName}, ${s.city ?? null}, ${s.country ?? null}, ${s.targetDate ?? null}, ${s.capacity ?? null},
            ${s.feeOffered ?? null}, ${s.contactId ?? null}, ${s.notes ?? null}, ${s.userId}, ${s.userId})
    RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export async function updateShow(
  id: number,
  fields: Partial<Pick<Show, 'venue_name' | 'city' | 'country' | 'target_date' | 'capacity' | 'fee_offered' | 'status' | 'notes' | 'pitch_draft'>>,
  userId: number
) {
  const current = await getShowById(id);
  if (!current) return;
  const merged = { ...current, ...fields };
  await sql`
    UPDATE shows SET
      venue_name = ${merged.venue_name}, city = ${merged.city}, country = ${merged.country},
      target_date = ${merged.target_date}, capacity = ${merged.capacity}, fee_offered = ${merged.fee_offered},
      status = ${merged.status}, notes = ${merged.notes}, pitch_draft = ${merged.pitch_draft},
      updated_by = ${userId}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

// --- Playlists (manual tracking; no platform exposes a reverse-lookup API) ---
export type PlaylistStatus = 'pitched' | 'added' | 'removed';

export interface PlaylistEntry {
  id: number;
  name: string;
  platform: 'spotify' | 'apple_music' | 'youtube_music' | 'other';
  curator: string | null;
  song_title: string | null;
  followers: number | null;
  url: string | null;
  status: PlaylistStatus;
  date_added: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export async function getAllPlaylists(): Promise<PlaylistEntry[]> {
  return (await sql`SELECT * FROM playlists ORDER BY updated_at DESC`) as unknown as PlaylistEntry[];
}

export async function getPlaylistById(id: number): Promise<PlaylistEntry | undefined> {
  const rows = (await sql`SELECT * FROM playlists WHERE id = ${id}`) as unknown as PlaylistEntry[];
  return rows[0];
}

export async function createPlaylistEntry(p: {
  name: string;
  platform: string;
  curator?: string | null;
  songTitle?: string | null;
  followers?: number | null;
  url?: string | null;
  status?: string;
  dateAdded?: string | null;
  notes?: string | null;
  userId: number;
}): Promise<number> {
  const rows = (await sql`
    INSERT INTO playlists (name, platform, curator, song_title, followers, url, status, date_added, notes, created_by)
    VALUES (${p.name}, ${p.platform}, ${p.curator ?? null}, ${p.songTitle ?? null}, ${p.followers ?? null},
            ${p.url ?? null}, ${p.status ?? 'pitched'}, ${p.dateAdded ?? null}, ${p.notes ?? null}, ${p.userId})
    RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export async function updatePlaylistEntry(
  id: number,
  fields: Partial<Pick<PlaylistEntry, 'name' | 'platform' | 'curator' | 'song_title' | 'followers' | 'url' | 'status' | 'date_added' | 'notes'>>
) {
  const current = await getPlaylistById(id);
  if (!current) return;
  const merged = { ...current, ...fields };
  await sql`
    UPDATE playlists SET
      name = ${merged.name}, platform = ${merged.platform}, curator = ${merged.curator},
      song_title = ${merged.song_title}, followers = ${merged.followers}, url = ${merged.url},
      status = ${merged.status}, date_added = ${merged.date_added}, notes = ${merged.notes}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deletePlaylistEntry(id: number) {
  await sql`DELETE FROM playlists WHERE id = ${id}`;
}

// --- Activity log ---
export interface ActivityEntry {
  id: number;
  user_id: number | null;
  category: string;
  action: string;
  summary: string;
  created_at: string;
}

export async function logActivity(userId: number | null, category: string, action: string, summary: string) {
  try {
    await sql`INSERT INTO activity_log (user_id, category, action, summary) VALUES (${userId}, ${category}, ${action}, ${summary})`;
  } catch (err) {
    console.error('[activity_log] failed:', (err as Error).message);
  }
}

export async function getRecentActivity(limit = 50): Promise<ActivityEntry[]> {
  return (await sql`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ${limit}`) as unknown as ActivityEntry[];
}

// --- AI usage / rate limiting ---
export async function checkAndIncrementAiUsage(userId: number, endpoint: string, dailyLimit: number): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = (await sql`
    INSERT INTO ai_usage (user_id, endpoint, usage_date, count)
    VALUES (${userId}, ${endpoint}, ${today}, 1)
    ON CONFLICT (user_id, endpoint, usage_date) DO UPDATE SET count = ai_usage.count + 1
    RETURNING count
  `) as unknown as { count: number }[];
  return rows[0].count <= dailyLimit;
}

export async function getAiUsageToday(userId: number): Promise<{ endpoint: string; count: number }[]> {
  const today = new Date().toISOString().slice(0, 10);
  return (await sql`
    SELECT endpoint, count FROM ai_usage WHERE user_id = ${userId} AND usage_date = ${today}
  `) as unknown as { endpoint: string; count: number }[];
}

// --- User management (admin) ---
export async function createTeamUser(fields: {
  username: string;
  passwordHash: string;
  displayName: string;
  role: Role;
  location: string;
}): Promise<number> {
  const rows = (await sql`
    INSERT INTO users (username, password_hash, display_name, role, location, must_change_password)
    VALUES (${fields.username}, ${fields.passwordHash}, ${fields.displayName}, ${fields.role}, ${fields.location}, 1)
    RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export async function setUserActive(userId: number, active: boolean) {
  await sql`UPDATE users SET active = ${active} WHERE id = ${userId}`;
}

export async function setUserRole(userId: number, role: Role) {
  await sql`UPDATE users SET role = ${role} WHERE id = ${userId}`;
}

export async function forcePasswordReset(userId: number, passwordHash: string) {
  await sql`UPDATE users SET password_hash = ${passwordHash}, must_change_password = 1 WHERE id = ${userId}`;
}

// --- 2FA (TOTP) ---
export async function setTotpSecret(userId: number, secret: string | null, enabled: boolean) {
  await sql`UPDATE users SET totp_secret = ${secret}, totp_enabled = ${enabled} WHERE id = ${userId}`;
}

export async function setUserEmail(userId: number, email: string | null) {
  await sql`UPDATE users SET email = ${email} WHERE id = ${userId}`;
}

export async function getUsersWithEmail(): Promise<User[]> {
  return (await getAllUsers()).filter((u) => u.email && u.active !== false);
}

// --- DITO's long-term memory (persisted research, not per-conversation state) ---
export async function getDitoMemory(key: string): Promise<{ content: string; updatedAt: string } | undefined> {
  const rows = (await sql`SELECT content, updated_at FROM dito_memory WHERE key = ${key}`) as unknown as {
    content: string;
    updated_at: string;
  }[];
  return rows[0] ? { content: rows[0].content, updatedAt: rows[0].updated_at } : undefined;
}

export async function setDitoMemory(key: string, content: string) {
  await sql`
    INSERT INTO dito_memory (key, content) VALUES (${key}, ${content})
    ON CONFLICT (key) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
  `;
}

// --- Web push subscriptions (phone/browser notifications) ---
export interface PushSubscriptionRow {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export async function addPushSubscription(userId: number, endpoint: string, p256dh: string, auth: string) {
  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${endpoint}, ${p256dh}, ${auth})
    ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
  `;
}

export async function removePushSubscription(endpoint: string) {
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

export async function getPushSubscriptionsForUser(userId: number): Promise<PushSubscriptionRow[]> {
  return (await sql`SELECT * FROM push_subscriptions WHERE user_id = ${userId}`) as unknown as PushSubscriptionRow[];
}

export async function getAllPushSubscriptions(excludeUserId?: number | null): Promise<PushSubscriptionRow[]> {
  const rows = (await sql`SELECT * FROM push_subscriptions`) as unknown as PushSubscriptionRow[];
  return excludeUserId ? rows.filter((r) => r.user_id !== excludeUserId) : rows;
}

export async function setUserAvatar(userId: number, avatarUrl: string | null) {
  await sql`UPDATE users SET avatar_url = ${avatarUrl} WHERE id = ${userId}`;
}

export async function setUserDisplayName(userId: number, displayName: string) {
  await sql`UPDATE users SET display_name = ${displayName} WHERE id = ${userId}`;
}

// --- DITO assistant ---
export interface DitoConversation {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DitoMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  sources_json: string | null;
  created_at: string;
}

export async function getDitoConversations(userId: number): Promise<DitoConversation[]> {
  return (await sql`
    SELECT * FROM dito_conversations WHERE user_id = ${userId} ORDER BY updated_at DESC
  `) as unknown as DitoConversation[];
}

export async function createDitoConversation(userId: number, title: string): Promise<number> {
  const rows = (await sql`
    INSERT INTO dito_conversations (user_id, title) VALUES (${userId}, ${title}) RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export async function touchDitoConversation(id: number) {
  await sql`UPDATE dito_conversations SET updated_at = NOW() WHERE id = ${id}`;
}

export async function getDitoMessages(conversationId: number): Promise<DitoMessage[]> {
  return (await sql`
    SELECT * FROM dito_messages WHERE conversation_id = ${conversationId} ORDER BY created_at ASC
  `) as unknown as DitoMessage[];
}

export async function addDitoMessage(
  conversationId: number,
  role: 'user' | 'assistant',
  content: string,
  sourcesJson?: string | null
): Promise<number> {
  const rows = (await sql`
    INSERT INTO dito_messages (conversation_id, role, content, sources_json)
    VALUES (${conversationId}, ${role}, ${content}, ${sourcesJson ?? null})
    RETURNING id
  `) as unknown as { id: number }[];
  return rows[0].id;
}

export async function getDitoConversationOwner(conversationId: number): Promise<number | undefined> {
  const rows = (await sql`SELECT user_id FROM dito_conversations WHERE id = ${conversationId}`) as unknown as { user_id: number }[];
  return rows[0]?.user_id;
}

// --- Outlook contacts connection (per-user; one shared Azure app, each
// person consents individually — same trust model as social accounts:
// tokens are private, never shared between logins) ---
export interface OutlookAccount {
  id: number;
  user_id: number;
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  connected_at: string;
}

function decryptOutlook(row: OutlookAccount): OutlookAccount {
  return {
    ...row,
    access_token: row.access_token ? decrypt(row.access_token) : null,
    refresh_token: row.refresh_token ? decrypt(row.refresh_token) : null,
  };
}

export async function getOutlookAccount(userId: number): Promise<OutlookAccount | undefined> {
  const rows = (await sql`SELECT * FROM outlook_accounts WHERE user_id = ${userId}`) as unknown as OutlookAccount[];
  return rows[0] ? decryptOutlook(rows[0]) : undefined;
}

export async function upsertOutlookAccount(a: {
  userId: number;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}) {
  await sql`
    INSERT INTO outlook_accounts (user_id, email, access_token, refresh_token, expires_at)
    VALUES (${a.userId}, ${a.email}, ${encrypt(a.accessToken)}, ${encrypt(a.refreshToken)}, ${a.expiresAt})
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      connected_at = NOW()
  `;
}

export async function disconnectOutlookAccount(userId: number) {
  await sql`DELETE FROM outlook_accounts WHERE user_id = ${userId}`;
}

// --- Google Calendar connection (per-user; one shared Google app, same
// consent model as Outlook above) ---
export interface GoogleCalendarAccount {
  id: number;
  user_id: number;
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  connected_at: string;
}

function decryptCalendar(row: GoogleCalendarAccount): GoogleCalendarAccount {
  return {
    ...row,
    access_token: row.access_token ? decrypt(row.access_token) : null,
    refresh_token: row.refresh_token ? decrypt(row.refresh_token) : null,
  };
}

export async function getGoogleCalendarAccount(userId: number): Promise<GoogleCalendarAccount | undefined> {
  const rows = (await sql`
    SELECT * FROM google_calendar_accounts WHERE user_id = ${userId}
  `) as unknown as GoogleCalendarAccount[];
  return rows[0] ? decryptCalendar(rows[0]) : undefined;
}

export async function upsertGoogleCalendarAccount(a: {
  userId: number;
  email: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: string;
}) {
  // Google only returns a refresh_token on the very first consent; keep the
  // existing one on subsequent token refreshes where none is sent back.
  const existing = await getGoogleCalendarAccount(a.userId);
  const refreshToken = a.refreshToken || existing?.refresh_token;
  if (!refreshToken) throw new Error('No refresh token available for Google Calendar connection.');

  await sql`
    INSERT INTO google_calendar_accounts (user_id, email, access_token, refresh_token, expires_at)
    VALUES (${a.userId}, ${a.email}, ${encrypt(a.accessToken)}, ${encrypt(refreshToken)}, ${a.expiresAt})
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      connected_at = NOW()
  `;
}

export async function disconnectGoogleCalendarAccount(userId: number) {
  await sql`DELETE FROM google_calendar_accounts WHERE user_id = ${userId}`;
}
