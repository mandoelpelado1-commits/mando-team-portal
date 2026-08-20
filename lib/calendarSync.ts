import { getGoogleCalendarAccount, upsertGoogleCalendarAccount, setPostGoogleEventId, Post } from './db';
import { refreshAccessToken, upsertCalendarEvent, deleteCalendarEvent } from './googleCalendar';

async function getValidAccessToken(userId: number): Promise<string | null> {
  const account = await getGoogleCalendarAccount(userId);
  if (!account?.access_token || !account.refresh_token) return null;

  const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 2 * 60 * 1000) return account.access_token;

  const refreshed = await refreshAccessToken(account.refresh_token);
  await upsertGoogleCalendarAccount({
    userId,
    email: account.email || '',
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
  });
  return refreshed.accessToken;
}

/**
 * Push a scheduled post to the acting user's Google Calendar, if connected.
 * Best-effort: calendar sync is a convenience, not a source of truth, so a
 * failure here never blocks scheduling the post itself.
 */
export async function syncPostToGoogleCalendar(userId: number, post: Post): Promise<void> {
  try {
    if (!post.scheduled_for) return;
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) return;

    const eventId = await upsertCalendarEvent(
      accessToken,
      {
        title: `📱 ${post.platform}: ${post.caption.slice(0, 60)}${post.caption.length > 60 ? '…' : ''}`,
        description: [post.caption, post.link_url ? `Link: ${post.link_url}` : ''].filter(Boolean).join('\n\n'),
        startIso: post.scheduled_for,
        durationMinutes: 15,
      },
      post.google_event_id
    );
    await setPostGoogleEventId(post.id, eventId);
  } catch {
    // Swallow — scheduling the post itself already succeeded.
  }
}

export async function removePostFromGoogleCalendar(userId: number, post: Post): Promise<void> {
  try {
    if (!post.google_event_id) return;
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) return;
    await deleteCalendarEvent(accessToken, post.google_event_id);
    await setPostGoogleEventId(post.id, null);
  } catch {
    // Swallow — unscheduling the post itself already succeeded.
  }
}
