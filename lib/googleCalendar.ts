function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET);
}
export { isConfigured as isGoogleCalendarConfigured };

function baseUrl() {
  return process.env.APP_BASE_URL || 'http://localhost:3000';
}

export function redirectUri() {
  return `${baseUrl()}/api/calendar/google/callback`;
}

const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}

export async function exchangeCodeForToken(code: string): Promise<GoogleTokens> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

export async function getMyEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: ${await res.text()}`);
  const data = await res.json();
  return data.email || '';
}

export interface CalendarEventInput {
  title: string;
  description: string;
  startIso: string;
  durationMinutes?: number;
}

export async function upsertCalendarEvent(
  accessToken: string,
  input: CalendarEventInput,
  existingEventId?: string | null
): Promise<string> {
  const start = new Date(input.startIso);
  const end = new Date(start.getTime() + (input.durationMinutes ?? 30) * 60 * 1000);

  const body = {
    summary: input.title,
    description: input.description,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };

  const url = existingEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEventId}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  const res = await fetch(url, {
    method: existingEventId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // A stale/deleted event id (404/410) falls back to creating a fresh one
  // instead of failing the whole schedule action.
  if (!res.ok && existingEventId && (res.status === 404 || res.status === 410)) {
    return upsertCalendarEvent(accessToken, input, null);
  }
  if (!res.ok) throw new Error(`Google Calendar event ${existingEventId ? 'update' : 'create'} failed: ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar event delete failed: ${await res.text()}`);
  }
}
