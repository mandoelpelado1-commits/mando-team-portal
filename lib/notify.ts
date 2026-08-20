import { Resend } from 'resend';
import { getUsersWithEmail, User } from './db';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

const BRAND_HEADER = `<div style="background:#0b0b0f;padding:20px;text-align:center;color:#fff;font-weight:700;letter-spacing:2px;">MANDO EL PELADO — TEAM PORTAL</div>`;

async function sendEmail(to: string, subject: string, bodyHtml: string) {
  if (!isEmailConfigured()) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject,
      html: `${BRAND_HEADER}<div style="padding:24px;font-family:sans-serif;color:#18181b;">${bodyHtml}</div>`,
    });
  } catch (err) {
    // Notifications are best-effort — never let a failed email break the calling action.
    console.error('[notify] send failed:', (err as Error).message);
  }
}

/** Notify everyone except the actor. */
export async function notifyTeam(excludeUserId: number | null, subject: string, bodyHtml: string) {
  if (!isEmailConfigured()) return;
  const users = await getUsersWithEmail();
  await Promise.all(
    users.filter((u) => u.id !== excludeUserId).map((u) => sendEmail(u.email!, subject, bodyHtml))
  );
}

export async function notifyUser(user: Pick<User, 'email'>, subject: string, bodyHtml: string) {
  if (!user.email) return;
  await sendEmail(user.email, subject, bodyHtml);
}
