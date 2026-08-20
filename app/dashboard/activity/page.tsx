'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface ActivityItem {
  id: number;
  userName: string;
  category: string;
  action: string;
  summary: string;
  createdAt: string;
}

const CATEGORY_ICON: Record<string, string> = {
  ads: '📈',
  ideas: '💡',
  contacts: '📇',
  shows: '🎤',
  playlists: '🎧',
  admin: '⚙',
  security: '🔒',
};

export default function ActivityPage() {
  const { t, lang } = useLanguage();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/activity');
      const data = await res.json();
      setActivity(data.activity || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl tracking-wide text-white">{t('activity', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('activity', 'subtitle')}</p>

      {loading ? (
        <p className="mt-6 text-lg text-zinc-400">{t('common', 'loading')}</p>
      ) : activity.length === 0 ? (
        <p className="mt-6 text-base text-zinc-500">{t('activity', 'noActivity')}</p>
      ) : (
        <div className="mt-6 space-y-2">
          {activity.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-panel p-4">
              <span className="text-lg">{CATEGORY_ICON[a.category] || '•'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-base text-zinc-200">{a.summary}</p>
                <p className="mt-0.5 text-sm text-zinc-600">{new Date(a.createdAt).toLocaleString(locale)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
