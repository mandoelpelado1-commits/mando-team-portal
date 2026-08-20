import { isWixConfigured } from './wix';

export { isWixConfigured as isWixContactsConfigured };

export interface RawWixContact {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  subscribed: boolean;
}

interface WixContactApi {
  info?: {
    name?: { first?: string; last?: string };
    company?: string;
    emails?: { items?: { email: string; primary?: boolean }[] };
    phones?: { items?: { phone: string; primary?: boolean }[] };
    addresses?: { items?: { address?: { city?: string; country?: string } }[] };
  };
  primaryEmail?: { email?: string; subscriptionStatus?: string };
  primaryPhone?: { phone?: string };
}

function headers() {
  return {
    Authorization: process.env.WIX_API_KEY || '',
    'wix-site-id': process.env.WIX_SITE_ID || '',
  };
}

/** Every contact in the site's Wix CRM — this is also what Wix's own Email Marketing sends to. */
export async function fetchAllWixContacts(): Promise<RawWixContact[]> {
  const results: RawWixContact[] = [];
  const limit = 100;
  let offset = 0;

  // Cap the walk so one sync can't run away on a very large contact list.
  for (let page = 0; page < 50; page++) {
    const params = new URLSearchParams({
      fieldsets: 'FULL',
      'paging.limit': String(limit),
      'paging.offset': String(offset),
    });
    const res = await fetch(`https://www.wixapis.com/contacts/v4/contacts?${params.toString()}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`Wix contacts request failed: ${await res.text()}`);
    const data = await res.json();

    for (const c of (data.contacts || []) as WixContactApi[]) {
      const first = c.info?.name?.first || '';
      const last = c.info?.name?.last || '';
      const name = `${first} ${last}`.trim();
      const email = c.primaryEmail?.email || c.info?.emails?.items?.[0]?.email || null;
      if (!name && !email) continue; // skip contacts with nothing usable

      const address = c.info?.addresses?.items?.[0]?.address;
      results.push({
        name: name || email || 'Unknown',
        company: c.info?.company || null,
        email,
        phone: c.primaryPhone?.phone || c.info?.phones?.items?.[0]?.phone || null,
        city: address?.city || null,
        country: address?.country || null,
        subscribed: c.primaryEmail?.subscriptionStatus === 'SUBSCRIBED',
      });
    }

    const meta = data.pagingMetadata || {};
    offset += limit;
    if (!data.contacts?.length || (typeof meta.total === 'number' && offset >= meta.total)) break;
  }

  return results;
}
