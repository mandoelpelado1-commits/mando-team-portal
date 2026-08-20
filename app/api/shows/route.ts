import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllShows, createShow, logActivity } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ shows: await getAllShows() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.venueName) {
    return NextResponse.json({ error: 'Venue name is required.' }, { status: 400 });
  }

  const userId = Number(session.user.id);
  const id = await createShow({
    venueName: body.venueName,
    city: body.city || null,
    country: body.country || null,
    targetDate: body.targetDate || null,
    capacity: body.capacity ? Number(body.capacity) : null,
    feeOffered: body.feeOffered ? Number(body.feeOffered) : null,
    contactId: body.contactId ? Number(body.contactId) : null,
    notes: body.notes || null,
    userId,
  });
  await logActivity(userId, 'shows', 'created', `Added show target: ${body.venueName}`);
  return NextResponse.json({ id });
}
