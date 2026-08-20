import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRecentActivity, getAllUsers } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = new Map((await getAllUsers()).map((u) => [u.id, u.display_name]));
  const activity = (await getRecentActivity(80)).map((a) => ({
    id: a.id,
    userName: a.user_id ? users.get(a.user_id) || 'Unknown' : 'System',
    category: a.category,
    action: a.action,
    summary: a.summary,
    createdAt: a.created_at,
  }));

  return NextResponse.json({ activity });
}
