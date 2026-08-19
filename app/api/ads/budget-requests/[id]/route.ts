import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBudgetChangeRequestById, resolveBudgetChangeRequest } from '@/lib/db';
import { canApproveBudgetChange } from '@/lib/permissions';
import { applyBudgetChange, isGoogleAdsConfigured } from '@/lib/googleAds';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const requestId = Number(id);
  const body = await req.json();
  const action: 'approve' | 'reject' = body.action;

  const changeRequest = await getBudgetChangeRequestById(requestId);
  if (!changeRequest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (changeRequest.status !== 'pending') {
    return NextResponse.json({ error: 'This request has already been resolved.' }, { status: 409 });
  }

  const userId = Number(session.user.id);
  if (!canApproveBudgetChange(session.user.role, changeRequest.requested_by, userId)) {
    return NextResponse.json(
      { error: 'You cannot approve your own request, or your role is not permitted to approve.' },
      { status: 403 }
    );
  }

  if (action === 'reject') {
    await resolveBudgetChangeRequest(requestId, 'rejected', userId);
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  await resolveBudgetChangeRequest(requestId, 'approved', userId);

  if (!isGoogleAdsConfigured()) {
    await resolveBudgetChangeRequest(requestId, 'apply_failed', userId);
    return NextResponse.json(
      { ok: true, status: 'apply_failed', error: 'Google Ads API is not configured yet.' },
      { status: 200 }
    );
  }

  try {
    await applyBudgetChange(changeRequest.campaign_id, changeRequest.proposed_budget_micros);
    await resolveBudgetChangeRequest(requestId, 'applied', userId);
    return NextResponse.json({ ok: true, status: 'applied' });
  } catch (err: any) {
    await resolveBudgetChangeRequest(requestId, 'apply_failed', userId);
    return NextResponse.json({ ok: true, status: 'apply_failed', error: err.message });
  }
}
