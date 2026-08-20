import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllContacts, createContact, logActivity, ContactType } from '@/lib/db';
import { isDuplicateContact, ParsedContact } from '@/lib/contactImport';

const VALID_TYPES: ContactType[] = ['venue', 'promoter', 'press', 'sync', 'curator', 'other'];
const MAX_ROWS = 500;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number(session.user.id);

  const body = await req.json();
  const rows: ParsedContact[] = Array.isArray(body.contacts) ? body.contacts : [];
  if (rows.length === 0) return NextResponse.json({ error: 'No contacts to import.' }, { status: 400 });
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many contacts in one batch (max ${MAX_ROWS}).` }, { status: 400 });
  }

  let existing = await getAllContacts();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const r of rows) {
    if (!r || typeof r.name !== 'string' || !r.name.trim()) {
      errors.push('Skipped a row with no name.');
      continue;
    }
    const type = VALID_TYPES.includes(r.type) ? r.type : 'other';
    const candidate: ParsedContact = { ...r, type };

    if (isDuplicateContact(existing, candidate)) {
      skipped++;
      continue;
    }

    const id = await createContact({
      name: candidate.name.trim(),
      type,
      company: candidate.company || null,
      email: candidate.email || null,
      phone: candidate.phone || null,
      city: candidate.city || null,
      country: candidate.country || null,
      notes: candidate.notes || null,
      userId,
    });
    created++;
    // Keep the in-memory list current so later rows in this same batch also dedupe against it.
    existing = [...existing, { id, name: candidate.name, type, company: candidate.company ?? null, email: candidate.email ?? null, phone: candidate.phone ?? null, city: candidate.city ?? null, country: candidate.country ?? null, status: 'new', notes: candidate.notes ?? null, created_by: userId, updated_by: userId, created_at: '', updated_at: '' }];
  }

  if (created > 0) {
    await logActivity(userId, 'contacts', 'bulk_imported', `Imported ${created} contact(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ''}`);
  }

  return NextResponse.json({ created, skipped, errors });
}
