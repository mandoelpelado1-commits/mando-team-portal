import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById, updateUserPassword } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both current and new password are required.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
  }

  const user = await getUserById(Number(session.user.id));
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 });

  // Don't let someone "change" to the same temp password and skip the reset.
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'New password must be different from the current one.' }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(user.id, hash);

  return NextResponse.json({ ok: true });
}
