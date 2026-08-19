'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { TRANSLATIONS } from '@/lib/i18n';

interface MeasureValue {
  date: string;
  value: number;
}

interface MeasureItem {
  type: string;
  values: MeasureValue[];
  total: number;
}

const TYPE_KEYS: Record<string, keyof typeof TRANSLATIONS.website> = {
  TOTAL_SESSIONS: 'sessions',
  TOTAL_UNIQUE_VISITORS: 'uniqueVisitors',
  TOTAL_ORDERS: 'orders',
  TOTAL_SALES: 'sales',
  CLICKS_TO_CONTACT: 'clicksToContact',
  TOTAL_FORMS_SUBMITTED: 'formsSubmitted',
};

function formatValue(type: string, value: number) {
  if (type === 'TOTAL_SALES') return `$${value.toFixed(2)}`;
  return Math.round(value).toLocaleString();
}

export default function WebsitePage() {
  const { t } = useLanguage();
  const [configured, setConfigured] = useState(true);
  const [data, setData] = useState<MeasureItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch('/api/wix/analytics');
      const json = await res.json();
      setConfigured(json.configured);
      setData(json.data || []);
      setError(json.error || '');
      setLoading(false);
    })();
  }, []);

  const sessions = data.find((d) => d.type === 'TOTAL_SESSIONS');
  const maxSessions = sessions ? Math.max(...sessions.values.map((v) => v.value), 1) : 1;

  return (
    <div>
      <h1 className="font-display text-4xl tracking-wide text-white">{t('website', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('website', 'subtitle')}</p>

      {!configured && (
        <div className="mt-4 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-base text-gold">
          {t('website', 'notConnected')}
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
        configured && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.map((item) => (
                <div key={item.type} className="rounded-xl border border-zinc-800 bg-panel p-6">
                  <p className="text-sm uppercase tracking-wide text-zinc-400">
                    {TYPE_KEYS[item.type] ? t('website', TYPE_KEYS[item.type]) : item.type}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">{formatValue(item.type, item.total)}</p>
                </div>
              ))}
            </div>

            {sessions && sessions.values.length > 0 && (
              <div className="mt-8 rounded-xl border border-zinc-800 bg-panel p-6">
                <p className="mb-4 text-sm uppercase tracking-wide text-zinc-400">{t('website', 'sessionsPerDay')}</p>
                <div className="flex h-32 items-end gap-px sm:gap-1">
                  {sessions.values.map((v) => (
                    <div
                      key={v.date}
                      title={`${v.date}: ${Math.round(v.value)}`}
                      className="min-w-0 flex-1 rounded-t bg-gradient-to-t from-magenta to-cyan"
                      style={{ height: `${Math.max((v.value / maxSessions) * 100, 3)}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-sm text-zinc-500">
                  <span>{sessions.values[0]?.date}</span>
                  <span>{sessions.values[sessions.values.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
