import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { autocompleteVenues, isGooglePlacesConfigured } from '@/lib/googlePlaces';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isGooglePlacesConfigured()) {
    return NextResponse.json({ suggestions: [], configured: false });
  }

  const input = req.nextUrl.searchParams.get('input')?.trim() || '';
  if (input.length < 3) return NextResponse.json({ suggestions: [], configured: true });

  try {
    const suggestions = await autocompleteVenues(input);
    return NextResponse.json({ suggestions, configured: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
