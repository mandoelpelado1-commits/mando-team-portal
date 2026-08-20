import webpush from 'web-push';
import { getAllPushSubscriptions, getPushSubscriptionsForUser, removePushSubscription, PushSubscriptionRow } from './db';

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureConfigured() {
  if (configured || !isPushConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

async function sendToSubscription(sub: PushSubscriptionRow, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err: any) {
    // 404/410 means the browser dropped this subscription (uninstalled, cleared
    // storage, etc.) — clean it up so we stop trying. Any other error is
    // logged but never thrown; push is best-effort and must not break the
    // action that triggered it.
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await removePushSubscription(sub.endpoint).catch(() => {});
    } else {
      console.error('[push] send failed:', err?.message || err);
    }
  }
}

/** Notify everyone except the actor (used for team-wide events like a new idea). */
export async function pushToTeam(excludeUserId: number | null, payload: PushPayload) {
  if (!isPushConfigured()) return;
  ensureConfigured();
  const subs = await getAllPushSubscriptions(excludeUserId);
  await Promise.all(subs.map((s) => sendToSubscription(s, payload)));
}

/** Notify one specific user, on all of their registered devices. */
export async function pushToUser(userId: number, payload: PushPayload) {
  if (!isPushConfigured()) return;
  ensureConfigured();
  const subs = await getPushSubscriptionsForUser(userId);
  await Promise.all(subs.map((s) => sendToSubscription(s, payload)));
}

/** Notify absolutely everyone, including the actor (used for scheduled/system digests). */
export async function pushToEveryone(payload: PushPayload) {
  if (!isPushConfigured()) return;
  ensureConfigured();
  const subs = await getAllPushSubscriptions(null);
  await Promise.all(subs.map((s) => sendToSubscription(s, payload)));
}
