import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createIdea, getAllIdeas, getAllIdeaAcknowledgments, getAllUsers } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ideas = await getAllIdeas();
  const acks = await getAllIdeaAcknowledgments();
  const users = await getAllUsers();
  const userMap = new Map(users.map((u) => [u.id, u.display_name]));

  const acksByIdea = new Map<number, { userId: number; name: string; acknowledgedAt: string }[]>();
  for (const a of acks) {
    const list = acksByIdea.get(a.idea_id) || [];
    list.push({ userId: a.user_id, name: userMap.get(a.user_id) || 'Unknown', acknowledgedAt: a.acknowledged_at });
    acksByIdea.set(a.idea_id, list);
  }

  const result = ideas.map((idea) => ({
    id: idea.id,
    content: idea.content,
    createdAt: idea.created_at,
    author: { id: idea.user_id, name: userMap.get(idea.user_id) || 'Unknown' },
    acknowledgedBy: acksByIdea.get(idea.id) || [],
  }));

  return NextResponse.json({
    ideas: result,
    team: users.map((u) => ({ id: u.id, name: u.display_name })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content } = await req.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Idea content is required.' }, { status: 400 });
  }

  const id = await createIdea(Number(session.user.id), content.trim());
  return NextResponse.json({ id });
}
