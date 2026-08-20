import twilio from 'twilio';
import { getUsersWithPhone, User } from './db';

export function isSmsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

function client() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendSms(to: string, body: string) {
  if (!isSmsConfigured()) return;
  try {
    await client().messages.create({ to, from: process.env.TWILIO_FROM_NUMBER!, body });
  } catch (err) {
    // Notifications are best-effort — never let a failed text break the calling action.
    console.error('[sms] send failed:', (err as Error).message);
  }
}

/** Text everyone who has a phone number saved, except the actor. */
export async function smsTeam(excludeUserId: number | null, body: string) {
  if (!isSmsConfigured()) return;
  const users = await getUsersWithPhone();
  await Promise.all(
    users.filter((u) => u.id !== excludeUserId).map((u) => sendSms(u.phone_number!, body))
  );
}

export async function smsUser(user: Pick<User, 'phone_number'>, body: string) {
  if (!user.phone_number) return;
  await sendSms(user.phone_number, body);
}
