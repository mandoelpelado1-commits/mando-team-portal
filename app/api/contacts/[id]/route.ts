import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateContact, logActivity } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const userId = Number(session.user.id);

  await updateContact(Number(id), body, userId);
  if (body.status) await logActivity(userId, 'contacts', 'status_changed', `Contact #${id} → ${body.status}`);
  return NextResponse.json({ ok: true });
}
