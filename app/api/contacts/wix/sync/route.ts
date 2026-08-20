import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllContacts } from '@/lib/db';
import { fetchAllWixContacts, isWixContactsConfigured } from '@/lib/wixContacts';
import { isDuplicateContact, ParsedContact } from '@/lib/contactImport';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ configured: isWixContactsConfigured() });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isWixContactsConfigured()) {
    return NextResponse.json({ error: 'Wix is not connected. Set WIX_API_KEY and WIX_SITE_ID first.' }, { status: 501 });
  }

  try {
    const raw = await fetchAllWixContacts();
    const existing = await getAllContacts();

    const candidates: ParsedContact[] = raw.map((c) => ({
      name: c.name,
      type: 'other',
      company: c.company,
      email: c.email,
      phone: c.phone,
      city: c.city,
      country: c.country,
      notes: c.subscribed ? 'Subscribed to Wix mailing list' : null,
    }));

    const seenInBatch = new Set<string>();
    const deduped = candidates.filter((c) => {
      const key = c.email?.toLowerCase() || `${c.name.toLowerCase()}|${c.company?.toLowerCase() || ''}`;
      if (seenInBatch.has(key)) return false;
      seenInBatch.add(key);
      return !isDuplicateContact(existing, c);
    });

    return NextResponse.json({ contacts: deduped, totalFetched: raw.length, newCount: deduped.length });
  } catch (err: any) {
    return NextResponse.json({ error: `Wix sync failed: ${err.message}` }, { status: 502 });
  }
}
