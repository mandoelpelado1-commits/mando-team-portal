import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateShow, logActivity } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const userId = Number(session.user.id);

  const fields: Record<string, unknown> = { ...body };
  if (body.capacity !== undefined) fields.capacity = body.capacity ? Number(body.capacity) : null;
  if (body.feeOffered !== undefined) {
    fields.fee_offered = body.feeOffered ? Number(body.feeOffered) : null;
    delete fields.feeOffered;
  }
  if (body.venueName !== undefined) {
    fields.venue_name = body.venueName;
    delete fields.venueName;
  }
  if (body.targetDate !== undefined) {
    fields.target_date = body.targetDate || null;
    delete fields.targetDate;
  }

  await updateShow(Number(id), fields, userId);
  if (body.status) await logActivity(userId, 'shows', 'status_changed', `Show #${id} → ${body.status}`);
  return NextResponse.json({ ok: true });
}
