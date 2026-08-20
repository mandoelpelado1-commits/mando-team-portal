import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById, setTotpSecret, logActivity } from '@/lib/db';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(Number(session.user.id));
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await setTotpSecret(user.id, null, false);
  await logActivity(user.id, 'security', '2fa_disabled', `${user.display_name} disabled two-factor authentication`);
  return NextResponse.json({ ok: true });
}
