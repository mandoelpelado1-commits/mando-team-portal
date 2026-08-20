CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'artist')),
  location TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'facebook', 'youtube', 'x')),
  platform_username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS social_app_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'facebook', 'youtube', 'x')),
  client_id TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS ai_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_plan TEXT NOT NULL,
  tone TEXT,
  platforms TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_id INTEGER REFERENCES ai_drafts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'facebook', 'youtube', 'x')),
  caption TEXT NOT NULL,
  hashtags TEXT,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  publish_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_change_requests (
  id SERIAL PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  current_budget_micros BIGINT NOT NULL,
  proposed_budget_micros BIGINT NOT NULL,
  reason TEXT,
  requested_by INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'apply_failed')),
  approved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ideas (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idea_acknowledgments (
  id SERIAL PRIMARY KEY,
  idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idea_id, user_id)
);

CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_es TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done')),
  notes TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS milestone_guides (
  id SERIAL PRIMARY KEY,
  milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'es')),
  guide_json TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (milestone_id, lang)
);

CREATE TABLE IF NOT EXISTS daily_briefs (
  id SERIAL PRIMARY KEY,
  brief_date DATE NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'es')),
  content_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brief_date, lang)
);

CREATE TABLE IF NOT EXISTS dsp_profiles (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  manage_url TEXT NOT NULL,
  note_en TEXT NOT NULL,
  note_es TEXT NOT NULL,
  auto_metrics BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'not_claimed' CHECK (status IN ('not_claimed', 'pending', 'claimed', 'verified')),
  profile_url TEXT,
  external_id TEXT,
  followers INTEGER,
  popularity INTEGER,
  metrics_updated_at TIMESTAMPTZ,
  notes TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Contacts / CRM (press, venues, promoters, sync supervisors, curators)
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('venue', 'promoter', 'press', 'sync', 'curator', 'other')),
  company TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'negotiating', 'confirmed', 'passed', 'dead')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Show / booking pipeline, optionally linked to a contact
CREATE TABLE IF NOT EXISTS shows (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  venue_name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  target_date DATE,
  capacity INTEGER,
  fee_offered NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'prospecting' CHECK (status IN ('prospecting', 'pitched', 'negotiating', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  pitch_draft TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Playlist placements — no platform exposes a "which playlists is this track
-- on" API, so this is deliberately manual tracking, same pattern as
-- dsp_profiles. Team logs what they find via Spotify for Artists or discovery.
CREATE TABLE IF NOT EXISTS playlists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'spotify' CHECK (platform IN ('spotify', 'apple_music', 'youtube_music', 'other')),
  curator TEXT,
  song_title TEXT,
  followers INTEGER,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'pitched' CHECK (status IN ('pitched', 'added', 'removed')),
  date_added DATE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unified activity feed across features.
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON activity_log (created_at DESC);

-- Per-user, per-day counters so AI endpoints can't be hammered unbounded.
CREATE TABLE IF NOT EXISTS ai_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  usage_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, endpoint, usage_date)
);

-- TOTP-based 2FA. NULL secret = not enrolled.
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- DITO: AI assistant for grants/loans research and application help.
-- Uses Claude's server-side web search tool for current program info.
CREATE TABLE IF NOT EXISTS dito_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dito_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES dito_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dito_messages_conv_idx ON dito_messages (conversation_id, created_at);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS outlook_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS google_calendar_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS google_event_id TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS dito_memory (
  key TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);
