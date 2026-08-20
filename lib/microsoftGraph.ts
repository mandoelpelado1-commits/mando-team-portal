// Connects a team member's Outlook mailbox to import contacts. This works
// for ANY Microsoft 365 mailbox regardless of who resells it (GoDaddy,
// Microsoft directly, etc.) — a GoDaddy-hosted "Outlook" inbox is a real
// Microsoft 365 account under the hood, so auth always goes through
// login.microsoftonline.com. There is no separate "GoDaddy API" for this.

function isConfigured(): boolean {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}
export { isConfigured as isMicrosoftConfigured };

function baseUrl() {
  return process.env.APP_BASE_URL || 'http://localhost:3000';
}

export function redirectUri() {
  return `${baseUrl()}/api/contacts/outlook/callback`;
}

const SCOPES = 'offline_access User.Read Contacts.Read';

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: redirectUri(),
    response_mode: 'query',
    scope: SCOPES,
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

async function tokenRequest(body: URLSearchParams): Promise<MicrosoftTokens> {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Microsoft token request failed: ${await res.text()}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

export async function exchangeCodeForToken(code: string): Promise<MicrosoftTokens> {
  return tokenRequest(
    new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
      scope: SCOPES,
    })
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<MicrosoftTokens> {
  return tokenRequest(
    new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: SCOPES,
    })
  );
}

export async function getMyEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Microsoft Graph /me failed: ${await res.text()}`);
  const data = await res.json();
  return data.mail || data.userPrincipalName || '';
}

export interface RawOutlookContact {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
}

export async function fetchAllContacts(accessToken: string): Promise<RawOutlookContact[]> {
  const results: RawOutlookContact[] = [];
  let url: string | null =
    'https://graph.microsoft.com/v1.0/me/contacts?$top=250&$select=displayName,companyName,emailAddresses,businessPhones,mobilePhone,businessAddress';

  // A single mailbox could have thousands of contacts; cap the walk so one
  // sync can't run away on a very large address book.
  let pages = 0;
  while (url && pages < 20) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Microsoft Graph /me/contacts failed: ${await res.text()}`);
    const data = await res.json();
    for (const c of data.value || []) {
      if (!c.displayName) continue;
      results.push({
        name: c.displayName,
        company: c.companyName || null,
        email: c.emailAddresses?.[0]?.address || null,
        phone: c.businessPhones?.[0] || c.mobilePhone || null,
        city: c.businessAddress?.city || null,
        country: c.businessAddress?.countryOrRegion || null,
      });
    }
    url = data['@odata.nextLink'] || null;
    pages++;
  }
  return results;
}
