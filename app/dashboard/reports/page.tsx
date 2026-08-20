'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface ReportData {
  milestoneProgress: { done: number; total: number };
  platformsClaimed: { claimed: number; total: number };
  spotifyFollowers: number | null;
  adSpend30: number | null;
  webSessions30: number | null;
  merchRevenue30: number | null;
}

function Stat({ label, value, accent = 'text-white', noDataLabel }: { label: string; value: string | null; accent?: string; noDataLabel: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-panel p-6">
      <p className="text-sm uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${value === null ? 'text-zinc-600' : accent}`}>
        {value === null ? '—' : value}
      </p>
      {value === null && <p className="mt-1 text-sm text-zinc-600">{noDataLabel}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/reports');
      setData(await res.json());
      setLoading(false);
    })();
  }, []);

  const noData = t('reports', 'noData');

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl tracking-wide text-white">{t('reports', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('reports', 'subtitle')}</p>

      {loading || !data ? (
        <p className="mt-6 text-lg text-zinc-400">{t('common', 'loading')}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Stat
            label={t('reports', 'socialFollowers')}
            value={data.spotifyFollowers !== null ? data.spotifyFollowers.toLocaleString(locale) : null}
            accent="text-cyan"
            noDataLabel={noData}
          />
          <Stat
            label={t('reports', 'adSpend30')}
            value={data.adSpend30 !== null ? `$${data.adSpend30.toLocaleString(locale, { maximumFractionDigits: 2 })}` : null}
            accent="text-gold"
            noDataLabel={noData}
          />
          <Stat
            label={t('reports', 'merchRevenue30')}
            value={data.merchRevenue30 !== null ? `$${data.merchRevenue30.toLocaleString(locale, { maximumFractionDigits: 2 })}` : null}
            accent="text-cyan"
            noDataLabel={noData}
          />
          <Stat
            label={t('reports', 'webSessions30')}
            value={data.webSessions30 !== null ? Math.round(data.webSessions30).toLocaleString(locale) : null}
            noDataLabel={noData}
          />
          <Stat
            label={t('reports', 'milestoneProgress')}
            value={`${data.milestoneProgress.done} / ${data.milestoneProgress.total}`}
            accent="text-cyan"
            noDataLabel={noData}
          />
          <Stat
            label={t('reports', 'platformsClaimed')}
            value={`${data.platformsClaimed.claimed} / ${data.platformsClaimed.total}`}
            noDataLabel={noData}
          />
        </div>
      )}
    </div>
  );
}
