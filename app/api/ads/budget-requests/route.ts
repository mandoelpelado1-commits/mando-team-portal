import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createBudgetChangeRequest, getBudgetChangeRequests } from '@/lib/db';
import { canProposeBudgetChange } from '@/lib/permissions';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ requests: await getBudgetChangeRequests() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canProposeBudgetChange(session.user.role)) {
    return NextResponse.json({ error: 'Your role cannot propose budget changes.' }, { status: 403 });
  }

  const body = await req.json();
  const { campaignId, campaignName, currentBudgetMicros, proposedBudgetMicros, reason } = body;

  if (!campaignId || !campaignName || currentBudgetMicros == null || proposedBudgetMicros == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const id = await createBudgetChangeRequest({
    campaign_id: campaignId,
    campaign_name: campaignName,
    current_budget_micros: currentBudgetMicros,
    proposed_budget_micros: proposedBudgetMicros,
    reason,
    requested_by: Number(session.user.id),
  });

  return NextResponse.json({ id });
}
