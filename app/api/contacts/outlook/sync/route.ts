import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOutlookAccount, upsertOutlookAccount, getAllContacts } from '@/lib/db';
import { fetchAllContacts, refreshAccessToken } from '@/lib/microsoftGraph';
import { isDuplicateContact, ParsedContact } from '@/lib/contactImport';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number(session.user.id);

  const account = await getOutlookAccount(userId);
  if (!account || !account.access_token || !account.refresh_token) {
    return NextResponse.json({ error: 'Outlook is not connected.' }, { status: 400 });
  }

  try {
    let accessToken = account.access_token;
    // Access tokens are short-lived; refresh proactively if we're within 2
    // minutes of expiry (or the timestamp is missing/invalid).
    const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;
    if (expiresAt - Date.now() < 2 * 60 * 1000) {
      const refreshed = await refreshAccessToken(account.refresh_token);
      accessToken = refreshed.accessToken;
      await upsertOutlookAccount({
        userId,
        email: account.email || '',
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
      });
    }

    const raw = await fetchAllContacts(accessToken);
    const existing = await getAllContacts();

    const candidates: ParsedContact[] = raw.map((c) => ({
      name: c.name,
      type: 'other',
      company: c.company,
      email: c.email,
      phone: c.phone,
      city: c.city,
      country: c.country,
      notes: null,
    }));

    const seenInBatch = new Set<string>();
    const deduped = candidates.filter((c) => {
      const key = (c.email?.toLowerCase() || `${c.name.toLowerCase()}|${c.company?.toLowerCase() || ''}`);
      if (seenInBatch.has(key)) return false;
      seenInBatch.add(key);
      return !isDuplicateContact(existing, c);
    });

    return NextResponse.json({ contacts: deduped, totalFetched: raw.length, newCount: deduped.length });
  } catch (err: any) {
    return NextResponse.json({ error: `Outlook sync failed: ${err.message}` }, { status: 502 });
  }
}
