import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById, setUserDisplayName, logActivity } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getUserById(Number(session.user.id));
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    username: user.username,
    role: user.role,
    location: user.location,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number(session.user.id);

  const { displayName } = await req.json();
  const trimmed = typeof displayName === 'string' ? displayName.trim() : '';
  if (!trimmed || trimmed.length > 80) {
    return NextResponse.json({ error: 'Name must be 1-80 characters.' }, { status: 400 });
  }

  await setUserDisplayName(userId, trimmed);
  await logActivity(userId, 'settings', 'profile_updated', `Changed display name to "${trimmed}"`);
  return NextResponse.json({ ok: true });
}
