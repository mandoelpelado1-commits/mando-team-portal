'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface Summary {
  shopId: number;
  shopTitle: string;
  salesChannel: string;
  totals: {
    orders: number;
    revenue: number;
    last30Revenue: number;
    last30Orders: number;
    avgOrderValue: number;
  };
  topProducts: { title: string; quantity: number; revenue: number }[];
  recentOrders: {
    id: string;
    status: string;
    createdAt: string;
    total: number;
    itemCount: number;
    items: { title: string; quantity: number; price: number }[];
  }[];
  daily: { date: string; revenue: number; orders: number }[];
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MerchPage() {
  const { t, lang } = useLanguage();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch('/api/merch');
      const data = await res.json();
      setConfigured(data.configured);
      setSummary(data.summary);
      setError(data.error || '');
      setLoading(false);
    })();
  }, []);

  const maxDaily = summary ? Math.max(...summary.daily.map((d) => d.revenue), 1) : 1;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide text-white">{t('merch', 'title')}</h1>
          <p className="mt-2 text-base text-zinc-400">
            {t('merch', 'subtitle')}
            {summary && <span className="text-zinc-500"> · {summary.shopTitle}</span>}
          </p>
        </div>
        <a
          href="https://printify.com/app/store"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-magenta hover:text-white"
        >
          {t('merch', 'openPrintify')} ↗
        </a>
      </div>

      {!configured && (
        <div className="mt-4 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-base text-gold">
          {t('merch', 'notConfigured')}
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
        summary && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-cyan/30 bg-panel p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">{t('merch', 'revenue30')}</p>
                <p className="mt-2 text-3xl font-semibold text-cyan">{money(summary.totals.last30Revenue)}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-panel p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">{t('merch', 'orders30')}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{summary.totals.last30Orders}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-panel p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">{t('merch', 'revenueAll')}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{money(summary.totals.revenue)}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-panel p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">{t('merch', 'avgOrder')}</p>
                <p className="mt-2 text-3xl font-semibold text-gold">{money(summary.totals.avgOrderValue)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
              <p className="mb-4 text-sm uppercase tracking-wide text-zinc-400">{t('merch', 'dailyRevenue')}</p>
              <div className="flex h-32 items-end gap-px sm:gap-1">
                {summary.daily.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${money(d.revenue)} · ${d.orders}`}
                    className="min-w-0 flex-1 rounded-t bg-gradient-to-t from-magenta to-cyan"
                    style={{ height: `${Math.max((d.revenue / maxDaily) * 100, 2)}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-sm text-zinc-500">
                <span>{summary.daily[0]?.date}</span>
                <span>{summary.daily[summary.daily.length - 1]?.date}</span>
              </div>
            </div>

            {summary.topProducts.length > 0 && (
              <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
                <p className="mb-4 text-sm uppercase tracking-wide text-zinc-400">{t('merch', 'topProducts')}</p>
                <div className="space-y-3">
                  {summary.topProducts.map((p) => (
                    <div
                      key={p.title}
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-800 pb-2 last:border-0"
                    >
                      <span className="min-w-0 text-base text-zinc-200">{p.title}</span>
                      <span className="shrink-0 text-sm text-zinc-500">
                        {p.quantity} {t('merch', 'units')} ·{' '}
                        <span className="text-cyan">{money(p.revenue)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
              <p className="mb-4 text-sm uppercase tracking-wide text-zinc-400">{t('merch', 'recentOrders')}</p>
              {summary.recentOrders.length === 0 ? (
                <p className="text-base text-zinc-500">{t('merch', 'noOrders')}</p>
              ) : (
                <div className="space-y-3">
                  {summary.recentOrders.map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-zinc-800 bg-black/20 p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-base text-white">{money(o.total)}</p>
                        <p className="text-sm text-zinc-500">
                          {o.itemCount} {t('merch', 'items')} ·{' '}
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString(locale) : ''}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                        {o.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-4 text-sm text-zinc-600">{t('merch', 'cancelledNote')}</p>
            </div>
          </>
        )
      )}
    </div>
  );
}
