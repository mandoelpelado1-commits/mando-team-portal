const WIX_TIMEZONE = 'America/Guayaquil';

export type WixMeasurementType =
  | 'TOTAL_SESSIONS'
  | 'TOTAL_UNIQUE_VISITORS'
  | 'TOTAL_ORDERS'
  | 'TOTAL_SALES'
  | 'CLICKS_TO_CONTACT'
  | 'TOTAL_FORMS_SUBMITTED';

export interface WixMeasureValue {
  date: string;
  value: number;
}

export interface WixMeasureItem {
  type: WixMeasurementType;
  values: WixMeasureValue[];
  total: number;
}

export function isWixConfigured(): boolean {
  return Boolean(process.env.WIX_API_KEY && process.env.WIX_SITE_ID);
}

function toLocalDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getSiteAnalytics(days = 30): Promise<WixMeasureItem[]> {
  const cappedDays = Math.min(days, 61);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - cappedDays);

  const measurementTypes: WixMeasurementType[] = [
    'TOTAL_SESSIONS',
    'TOTAL_UNIQUE_VISITORS',
    'TOTAL_ORDERS',
    'TOTAL_SALES',
    'CLICKS_TO_CONTACT',
    'TOTAL_FORMS_SUBMITTED',
  ];

  const params = new URLSearchParams({
    'dateRange.startDate': toLocalDate(start),
    'dateRange.endDate': toLocalDate(end),
    timeZone: WIX_TIMEZONE,
  });
  for (const type of measurementTypes) params.append('measurementTypes', type);

  const res = await fetch(`https://www.wixapis.com/analytics/v2/site-analytics/data?${params.toString()}`, {
    headers: {
      Authorization: process.env.WIX_API_KEY || '',
      'wix-site-id': process.env.WIX_SITE_ID || '',
    },
  });

  if (!res.ok) throw new Error(`Wix analytics request failed: ${await res.text()}`);
  const data = await res.json();
  return data.data as WixMeasureItem[];
}
