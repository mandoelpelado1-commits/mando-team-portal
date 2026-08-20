import { NextRequest, NextResponse } from 'next/server';
import { createContact, getAllContacts, logActivity } from '@/lib/db';
import { fetchAllWixContacts, isWixContactsConfigured } from '@/lib/wixContacts';
import { isDuplicateContact, ParsedContact } from '@/lib/contactImport';

// Hit on a schedule (see .github/workflows/wix-contacts-sync.yml — Vercel's
// Hobby plan only allows daily Cron, too slow for "new sub shows up in
// Contacts automatically") to pull any new Wix mailing-list contacts and
// import them straight in, no manual review step.
const SYSTEM_USER_ID = 1;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.WIX_SYNC_SECRET && authHeader !== `Bearer ${process.env.WIX_SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isWixContactsConfigured()) {
    return NextResponse.json({ skipped: 'Wix not configured' });
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
    let created = 0;
    for (const c of candidates) {
      const key = c.email?.toLowerCase() || `${c.name.toLowerCase()}|${c.company?.toLowerCase() || ''}`;
      if (seenInBatch.has(key)) continue;
      seenInBatch.add(key);
      if (isDuplicateContact(existing, c)) continue;
      await createContact({ ...c, userId: SYSTEM_USER_ID });
      created++;
    }

    if (created > 0) {
      await logActivity(null, 'contacts', 'wix_auto_sync', `Auto-synced ${created} new contact(s) from the Wix mailing list.`);
    }

    return NextResponse.json({ totalFetched: raw.length, created });
  } catch (err: any) {
    return NextResponse.json({ error: `Wix auto-sync failed: ${err.message}` }, { status: 502 });
  }
}
