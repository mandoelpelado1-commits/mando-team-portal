import { NextRequest, NextResponse } from 'next/server';
import * as OTPAuth from 'otpauth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById, setTotpSecret, logActivity } from '@/lib/db';

// Confirms the user actually scanned the QR code correctly, then enables 2FA.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  const user = await getUserById(Number(session.user.id));
  if (!user?.totp_secret) {
    return NextResponse.json({ error: 'Run setup first.' }, { status: 400 });
  }

  const totp = new OTPAuth.TOTP({ algorithm: 'SHA1', digits: 6, period: 30, secret: user.totp_secret });
  const delta = totp.validate({ token: String(code || '').trim(), window: 1 });

  if (delta === null) {
    return NextResponse.json({ error: 'Incorrect code. Check the time on your phone and try again.' }, { status: 400 });
  }

  await setTotpSecret(user.id, user.totp_secret, true);
  await logActivity(user.id, 'security', '2fa_enabled', `${user.display_name} enabled two-factor authentication`);
  return NextResponse.json({ ok: true });
}
