'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface Brief {
  date: string;
  headline: string;
  budget: string;
  attention: string[];
  tip: string;
}

export default function DailyBrief() {
  const { t, lang } = useLanguage();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/briefs?lang=${lang}`);
    const data = await res.json();
    setBrief(data.latest);
    setAiConfigured(data.aiConfigured);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function refresh() {
    setRefreshing(true);
    setError('');
    try {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setBrief(data.latest);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm uppercase tracking-wide text-gold">
          ☀ {t('brief', 'todaysBrief')}
          {brief && (
            <span className="ml-2 text-zinc-500">
              {new Date(brief.date + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-EC' : 'en-US')}
            </span>
          )}
        </p>
        {aiConfigured && (
          <button
            onClick={refresh}
            disabled={refreshing}
            className="rounded-md border border-zinc-700 px-4 py-1.5 text-sm text-zinc-400 hover:border-gold hover:text-white disabled:opacity-50"
          >
            {refreshing ? t('brief', 'refreshing') : t('brief', 'refresh')}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-base text-magenta">{error}</p>}

      {loading ? (
        <p className="mt-4 text-base text-zinc-400">{t('common', 'loading')}</p>
      ) : !aiConfigured ? (
        <p className="mt-4 text-base text-zinc-400">{t('brief', 'aiNotConfigured')}</p>
      ) : !brief ? (
        <p className="mt-4 text-base text-zinc-400">{t('brief', 'noBrief')}</p>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-lg leading-relaxed text-white">{brief.headline}</p>

          <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
            <p className="text-sm uppercase tracking-wide text-cyan">💵 {t('brief', 'budgetLine')}</p>
            <p className="mt-1 text-base text-zinc-300">{brief.budget}</p>
          </div>

          {brief.attention?.length > 0 && (
            <div>
              <p className="mb-2 text-sm uppercase tracking-wide text-magenta">⚠ {t('brief', 'needsAttention')}</p>
              <ul className="list-inside list-disc space-y-1 text-base text-zinc-300">
                {brief.attention.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
            <p className="text-sm uppercase tracking-wide text-gold">💡 {t('brief', 'tipOfDay')}</p>
            <p className="mt-1 text-base text-zinc-200">{brief.tip}</p>
          </div>
        </div>
      )}
    </div>
  );
}
