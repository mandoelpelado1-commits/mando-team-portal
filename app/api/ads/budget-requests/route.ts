import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createBudgetChangeRequest, getBudgetChangeRequests, logActivity } from '@/lib/db';
import { canProposeBudgetChange } from '@/lib/permissions';
import { notifyTeam } from '@/lib/notify';
import { pushToTeam } from '@/lib/push';

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

  const userId = Number(session.user.id);
  const id = await createBudgetChangeRequest({
    campaign_id: campaignId,
    campaign_name: campaignName,
    current_budget_micros: currentBudgetMicros,
    proposed_budget_micros: proposedBudgetMicros,
    reason,
    requested_by: userId,
  });

  await logActivity(
    userId,
    'ads',
    'budget_proposed',
    `${session.user.name} proposed a budget change for ${campaignName}: $${(currentBudgetMicros / 1e6).toFixed(2)} → $${(proposedBudgetMicros / 1e6).toFixed(2)}`
  );

  await notifyTeam(
    userId,
    `Budget approval needed: ${campaignName}`,
    `<p><strong>${session.user.name}</strong> proposed a budget change that needs your approval.</p>
     <p>${campaignName}: $${(currentBudgetMicros / 1e6).toFixed(2)} → $${(proposedBudgetMicros / 1e6).toFixed(2)}</p>
     ${reason ? `<p>Reason: ${reason}</p>` : ''}
     <p><a href="${process.env.APP_BASE_URL || ''}/dashboard/ads">Review it in the portal</a></p>`
  );

  await pushToTeam(userId, {
    title: '📈 Budget approval needed',
    body: `${campaignName}: $${(currentBudgetMicros / 1e6).toFixed(2)} → $${(proposedBudgetMicros / 1e6).toFixed(2)}`,
    url: '/dashboard/ads',
  });

  return NextResponse.json({ id });
}
