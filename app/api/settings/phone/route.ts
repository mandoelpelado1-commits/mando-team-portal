import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setUserPhone, getUserById } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getUserById(Number(session.user.id));
  return NextResponse.json({ phoneNumber: user?.phone_number || '' });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { phoneNumber } = await req.json();
  const trimmed = phoneNumber?.trim() || '';
  // Loose E.164 check — Twilio itself will reject anything it truly can't deliver to.
  if (trimmed && !/^\+?[1-9]\d{7,14}$/.test(trimmed.replace(/[\s()-]/g, ''))) {
    return NextResponse.json({ error: 'Enter a valid phone number with country code, e.g. +18095551234.' }, { status: 400 });
  }

  const normalized = trimmed ? trimmed.replace(/[\s()-]/g, '') : null;
  await setUserPhone(Number(session.user.id), normalized);
  return NextResponse.json({ ok: true });
}
