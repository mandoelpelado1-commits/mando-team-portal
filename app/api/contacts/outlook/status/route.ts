import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOutlookAccount } from '@/lib/db';
import { isMicrosoftConfigured } from '@/lib/microsoftGraph';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const account = await getOutlookAccount(Number(session.user.id));
  return NextResponse.json({
    configured: isMicrosoftConfigured(),
    connected: Boolean(account),
    email: account?.email || null,
  });
}
