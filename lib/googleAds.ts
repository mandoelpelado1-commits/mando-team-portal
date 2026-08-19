const API_VERSION = 'v17';

export interface AdsCampaign {
  id: string;
  name: string;
  status: string;
  budgetMicros: number;
  costMicros: number;
}

export function isGoogleAdsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CUSTOMER_ID
  );
}

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google Ads token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

function customerId(): string {
  return (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/-/g, '');
}

async function adsRequest(path: string, body: unknown) {
  const accessToken = await getAccessToken();
  const res = await fetch(`https://googleads.googleapis.com/${API_VERSION}/customers/${customerId()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Ads API error: ${await res.text()}`);
  return res.json();
}

export async function listCampaigns(): Promise<AdsCampaign[]> {
  const query = `
    SELECT campaign.id, campaign.name, campaign.status,
           campaign_budget.amount_micros,
           metrics.cost_micros
    FROM campaign
    WHERE segments.date DURING THIS_MONTH
  `;
  const data = await adsRequest('/googleAds:search', { query });
  const rows = data.results || [];
  const byCampaign = new Map<string, AdsCampaign>();
  for (const row of rows) {
    const id = String(row.campaign.id);
    const existing = byCampaign.get(id);
    const cost = Number(row.metrics?.costMicros || 0);
    if (existing) {
      existing.costMicros += cost;
    } else {
      byCampaign.set(id, {
        id,
        name: row.campaign.name,
        status: row.campaign.status,
        budgetMicros: Number(row.campaignBudget?.amountMicros || 0),
        costMicros: cost,
      });
    }
  }
  return Array.from(byCampaign.values());
}

export async function applyBudgetChange(campaignId: string, newBudgetMicros: number): Promise<void> {
  // TODO: resolve the campaign's campaign_budget resource name via a GAQL lookup
  // (campaign_budget.resource_name from the campaign row) before mutating in production.
  const query = `SELECT campaign_budget.resource_name FROM campaign WHERE campaign.id = ${campaignId}`;
  const data = await adsRequest('/googleAds:search', { query });
  const resourceName = data.results?.[0]?.campaignBudget?.resourceName;
  if (!resourceName) throw new Error('Could not resolve campaign budget resource name');

  await adsRequest('/campaignBudgets:mutate', {
    operations: [
      {
        update: { resourceName, amountMicros: String(newBudgetMicros) },
        updateMask: 'amountMicros',
      },
    ],
  });
}
