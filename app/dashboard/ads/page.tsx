'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/components/LanguageProvider';

interface Campaign {
  id: string;
  name: string;
  status: string;
  budgetMicros: number;
  costMicros: number;
}

interface BudgetRequest {
  id: number;
  campaign_id: string;
  campaign_name: string;
  current_budget_micros: number;
  proposed_budget_micros: number;
  reason: string | null;
  requested_by: number;
  status: string;
  approved_by: number | null;
  created_at: string;
}

function fromMicros(micros: number) {
  return (micros / 1_000_000).toFixed(2);
}

function toMicros(dollars: number) {
  return Math.round(dollars * 1_000_000);
}

export default function AdsPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [configured, setConfigured] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState<Campaign | null>(null);
  const [newBudget, setNewBudget] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const role = session?.user?.role;
  const canPropose = role === 'admin' || role === 'manager';
  const userId = session?.user?.id ? Number(session.user.id) : null;

  async function load() {
    setLoading(true);
    const [campaignsRes, requestsRes] = await Promise.all([
      fetch('/api/ads/campaigns').then((r) => r.json()),
      fetch('/api/ads/budget-requests').then((r) => r.json()),
    ]);
    setConfigured(campaignsRes.configured);
    setCampaigns(campaignsRes.campaigns || []);
    setRequests(requestsRes.requests || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitProposal() {
    if (!proposing || !newBudget) return;
    setError('');
    const res = await fetch('/api/ads/budget-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: proposing.id,
        campaignName: proposing.name,
        currentBudgetMicros: proposing.budgetMicros,
        proposedBudgetMicros: toMicros(Number(newBudget)),
        reason,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }
    setProposing(null);
    setNewBudget('');
    setReason('');
    load();
  }

  async function resolve(id: number, action: 'approve' | 'reject') {
    const res = await fetch(`/api/ads/budget-requests/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    load();
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const resolved = requests.filter((r) => r.status !== 'pending');

  return (
    <div>
      <h1 className="font-display text-4xl tracking-wide text-white">{t('ads', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('ads', 'subtitle')}</p>

      {!configured && (
        <div className="mt-4 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-base text-gold">
          {t('ads', 'notConnected')}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-md border border-magenta/40 bg-magenta/10 px-4 py-3 text-base text-magenta">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-lg text-zinc-400">{t('common', 'loading')}</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-xl border border-zinc-800 bg-panel p-6">
                <p className="text-base font-semibold text-white">{c.name}</p>
                <p className="text-sm text-zinc-500">{c.status}</p>
                <div className="mt-4 flex justify-between text-base">
                  <span className="text-zinc-400">{t('ads', 'budgetPerDay')}</span>
                  <span className="text-white">${fromMicros(c.budgetMicros)}</span>
                </div>
                <div className="mt-2 flex justify-between text-base">
                  <span className="text-zinc-400">{t('ads', 'spendThisMonth')}</span>
                  <span className="text-cyan">${fromMicros(c.costMicros)}</span>
                </div>
                {canPropose && (
                  <button
                    onClick={() => {
                      setProposing(c);
                      setNewBudget(fromMicros(c.budgetMicros));
                    }}
                    className="mt-5 rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-magenta hover:text-white"
                  >
                    {t('ads', 'proposeChange')}
                  </button>
                )}
              </div>
            ))}
            {campaigns.length === 0 && configured && (
              <p className="text-base text-zinc-500">{t('ads', 'noCampaigns')}</p>
            )}
          </div>

          {proposing && (
            <div className="mt-6 max-w-md rounded-xl border border-magenta/40 bg-panel p-6">
              <p className="text-base font-semibold text-white">
                {t('ads', 'proposeFor')} {proposing.name}
              </p>
              <label className="mb-2 mt-4 block text-sm uppercase tracking-wide text-zinc-400">
                {t('ads', 'newDailyBudget')}
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
              />
              <label className="mb-2 mt-4 block text-sm uppercase tracking-wide text-zinc-400">
                {t('ads', 'reason')}
              </label>
              <input
                className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('ads', 'reasonPlaceholder')}
              />
              <div className="mt-5 flex gap-2">
                <button
                  onClick={submitProposal}
                  className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black"
                >
                  {t('ads', 'submitForApproval')}
                </button>
                <button
                  onClick={() => setProposing(null)}
                  className="rounded-md border border-zinc-700 px-5 py-2.5 text-base text-zinc-400"
                >
                  {t('common', 'cancel')}
                </button>
              </div>
            </div>
          )}

          <div className="mt-10">
            <p className="mb-4 text-sm uppercase tracking-wide text-zinc-400">
              {t('ads', 'pendingApprovals')} ({pending.length})
            </p>
            <div className="space-y-3">
              {pending.length === 0 && <p className="text-base text-zinc-500">{t('ads', 'nothingPending')}</p>}
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-panel p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-base text-white">{r.campaign_name}</p>
                    <p className="text-sm text-zinc-400">
                      ${fromMicros(r.current_budget_micros)} &rarr; ${fromMicros(r.proposed_budget_micros)}
                      {r.reason ? ` · ${r.reason}` : ''}
                    </p>
                  </div>
                  {userId !== r.requested_by ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => resolve(r.id, 'approve')}
                        className="rounded-md bg-cyan/20 px-4 py-2 text-sm text-cyan"
                      >
                        {t('ads', 'approve')}
                      </button>
                      <button
                        onClick={() => resolve(r.id, 'reject')}
                        className="rounded-md bg-magenta/20 px-4 py-2 text-sm text-magenta"
                      >
                        {t('ads', 'reject')}
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-500">{t('ads', 'waitingOnOther')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {resolved.length > 0 && (
            <div className="mt-10">
              <p className="mb-4 text-sm uppercase tracking-wide text-zinc-400">{t('ads', 'history')}</p>
              <div className="space-y-2">
                {resolved.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      {r.campaign_name}: ${fromMicros(r.current_budget_micros)} &rarr; $
                      {fromMicros(r.proposed_budget_micros)}
                    </span>
                    <span
                      className={
                        r.status === 'applied'
                          ? 'text-cyan'
                          : r.status === 'rejected' || r.status === 'apply_failed'
                          ? 'text-magenta'
                          : 'text-gold'
                      }
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
