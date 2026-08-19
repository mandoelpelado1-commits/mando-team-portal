import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isPrintifyConfigured, getMerchSummary } from '@/lib/printify';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isPrintifyConfigured()) {
    return NextResponse.json({ configured: false, summary: null });
  }

  try {
    const summary = await getMerchSummary(process.env.PRINTIFY_SHOP_ID);
    return NextResponse.json({ configured: true, summary });
  } catch (err: any) {
    return NextResponse.json({ configured: true, summary: null, error: err.message }, { status: 502 });
  }
}
