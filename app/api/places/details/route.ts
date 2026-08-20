import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getVenueDetails } from '@/lib/googlePlaces';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const placeId = req.nextUrl.searchParams.get('placeId')?.trim();
  if (!placeId) return NextResponse.json({ error: 'placeId is required.' }, { status: 400 });

  try {
    const details = await getVenueDetails(placeId);
    return NextResponse.json({ details });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
