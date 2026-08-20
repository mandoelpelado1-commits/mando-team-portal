import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteMandoGoal, logActivity, updateMandoGoal } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const fields: Record<string, unknown> = {};
  if (typeof body.title === 'string') fields.title = body.title.trim().slice(0, 300);
  if (typeof body.notes === 'string' || body.notes === null) fields.notes = body.notes?.trim() || null;
  if (typeof body.status === 'string') fields.status = body.status;
  if (typeof body.dueDate === 'string' || body.dueDate === null) fields.due_date = body.dueDate || null;

  await updateMandoGoal(Number(id), fields, Number(session.user.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await deleteMandoGoal(Number(id));
  await logActivity(Number(session.user.id), 'mando_goals', 'deleted', `${session.user.name} removed a goal for Mando`);
  return NextResponse.json({ ok: true });
}
