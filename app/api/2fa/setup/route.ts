import { NextResponse } from 'next/server';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById, setTotpSecret } from '@/lib/db';

// Generates a new secret and QR code but does NOT enable 2FA yet — that
// happens in /api/2fa/verify once the user proves they scanned it correctly.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(Number(session.user.id));
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'Mando Portal',
    label: user.username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  await setTotpSecret(user.id, secret.base32, false);

  const qrDataUrl = await QRCode.toDataURL(totp.toString());
  return NextResponse.json({ secret: secret.base32, qrDataUrl });
}
