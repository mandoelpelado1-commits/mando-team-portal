import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllContacts, createContact, logActivity, ContactType } from '@/lib/db';

const VALID_TYPES: ContactType[] = ['venue', 'promoter', 'press', 'sync', 'curator', 'other'];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ contacts: await getAllContacts() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.name || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: 'Name and a valid type are required.' }, { status: 400 });
  }

  const userId = Number(session.user.id);
  const id = await createContact({
    name: body.name,
    type: body.type,
    company: body.company || null,
    email: body.email || null,
    phone: body.phone || null,
    city: body.city || null,
    country: body.country || null,
    notes: body.notes || null,
    userId,
  });
  await logActivity(userId, 'contacts', 'created', `Added ${body.type} contact: ${body.name}`);
  return NextResponse.json({ id });
}
