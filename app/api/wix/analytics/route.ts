import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isWixConfigured, getSiteAnalytics } from '@/lib/wix';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isWixConfigured()) {
    return NextResponse.json({ configured: false, data: [] });
  }

  try {
    const data = await getSiteAnalytics(30);
    return NextResponse.json({ configured: true, data });
  } catch (err: any) {
    return NextResponse.json({ configured: true, data: [], error: err.message }, { status: 502 });
  }
}
