import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createMandoGoal, getAllMandoGoals, getAllUsers, logActivity } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const goals = await getAllMandoGoals();
  const users = await getAllUsers();
  const userMap = new Map(users.map((u) => [u.id, u.display_name]));

  const result = goals.map((g) => ({
    id: g.id,
    title: g.title,
    notes: g.notes,
    status: g.status,
    dueDate: g.due_date,
    createdBy: g.created_by ? userMap.get(g.created_by) || null : null,
    updatedBy: g.updated_by ? userMap.get(g.updated_by) || null : null,
    updatedAt: g.updated_at,
  }));

  return NextResponse.json({ goals: result });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, notes, dueDate } = await req.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }

  const userId = Number(session.user.id);
  const id = await createMandoGoal({
    title: title.trim().slice(0, 300),
    notes: notes?.trim() || null,
    dueDate: dueDate || null,
    userId,
  });
  await logActivity(userId, 'mando_goals', 'created', `${session.user.name} added a goal for Mando: ${title.trim()}`);
  return NextResponse.json({ id });
}
