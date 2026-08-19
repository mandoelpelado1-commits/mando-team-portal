import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllMilestones, getAllUsers } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = new Map((await getAllUsers()).map((u) => [u.id, u.display_name]));

  const milestones = (await getAllMilestones()).map((m) => ({
    id: m.id,
    slug: m.slug,
    category: m.category,
    title_en: m.title_en,
    title_es: m.title_es,
    description_en: m.description_en,
    description_es: m.description_es,
    priority: m.priority,
    status: m.status,
    notes: m.notes,
    updatedBy: m.updated_by ? users.get(m.updated_by) || null : null,
    updatedAt: m.updated_at,
  }));

  return NextResponse.json({ milestones });
}
