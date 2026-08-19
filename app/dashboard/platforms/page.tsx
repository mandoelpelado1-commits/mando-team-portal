'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { TRANSLATIONS } from '@/lib/i18n';

type Status = 'not_claimed' | 'pending' | 'claimed' | 'verified';

interface Platform {
  id: number;
  slug: string;
  name: string;
  category: 'streaming' | 'video' | 'discovery' | 'dashboard' | 'royalties';
  manageUrl: string;
  note_en: string;
  note_es: string;
  autoMetrics: boolean;
  status: Status;
  profileUrl: string | null;
  externalId: string | null;
  followers: number | null;
  popularity: number | null;
  metricsUpdatedAt: string | null;
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

const CATEGORY_KEYS: Record<string, keyof typeof TRANSLATIONS.platforms> = {
  dashboard: 'catDashboard',
  streaming: 'catStreaming',
  video: 'catVideo',
  discovery: 'catDiscovery',
  royalties: 'catRoyalties',
};
const CATEGORY_ORDER = ['dashboard', 'streaming', 'video', 'royalties', 'discovery'];

const STATUS_KEYS: Record<Status, keyof typeof TRANSLATIONS.platforms> = {
  not_claimed: 'statusNotClaimed',
  pending: 'statusPending',
  claimed: 'statusClaimed',
  verified: 'statusVerified',
};

const STATUS_STYLE: Record<Status, string> = {
  not_claimed: 'border-zinc-700 text-zinc-500',
  pending: 'border-gold bg-gold/10 text-gold',
  claimed: 'border-cyan bg-cyan/10 text-cyan',
  verified: 'border-cyan bg-cyan/20 text-cyan',
};

export default function PlatformsPage() {
  const { t, lang } = useLanguage();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [spotifyConfigured, setSpotifyConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ profileUrl: string; externalId: string; notes: string }>({
    profileUrl: '',
    externalId: '',
    notes: '',
  });
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/platforms');
    const data = await res.json();
    setPlatforms(data.platforms || []);
    setSpotifyConfigured(data.spotifyConfigured);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(p: Platform, status: Status) {
    setError('');
    const res = await fetch(`/api/platforms/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        profileUrl: editing === p.id ? draft.profileUrl : p.profileUrl,
        externalId: editing === p.id ? draft.externalId : p.externalId,
        notes: editing === p.id ? draft.notes : p.notes,
      }),
    });
    if (!res.ok) setError((await res.json()).error);
    setEditing(null);
    load();
  }

  async function refresh(p: Platform) {
    setRefreshing(p.id);
    setError('');
    try {
      const res = await fetch(`/api/platforms/${p.id}/refresh`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else load();
    } finally {
      setRefreshing(null);
    }
  }

  const claimed = platforms.filter((p) => p.status === 'claimed' || p.status === 'verified').length;
  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl tracking-wide text-white">{t('platforms', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('platforms', 'subtitle')}</p>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm uppercase tracking-wide text-zinc-400">{t('platforms', 'claimed')}</p>
          <p className="text-base text-white">
            {claimed} / {platforms.length}
          </p>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-magenta to-cyan transition-all"
            style={{ width: `${platforms.length ? (claimed / platforms.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {!spotifyConfigured && (
        <div className="mt-4 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-base text-gold">
          {t('platforms', 'spotifyNotConfigured')}
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
        CATEGORY_ORDER.filter((c) => platforms.some((p) => p.category === c)).map((cat) => (
          <div key={cat} className="mt-8">
            <h2 className="text-sm uppercase tracking-wide text-gold">
              {t('platforms', CATEGORY_KEYS[cat])}
            </h2>
            <div className="mt-3 space-y-4">
              {platforms
                .filter((p) => p.category === cat)
                .map((p) => {
                  const isEditing = editing === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border bg-panel p-5 sm:p-6 ${
                        p.status === 'claimed' || p.status === 'verified' ? 'border-cyan/30' : 'border-zinc-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold text-white">{p.name}</p>
                          <p className="mt-1.5 text-base leading-relaxed text-zinc-400">
                            {lang === 'es' ? p.note_es : p.note_en}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-sm ${STATUS_STYLE[p.status]}`}
                        >
                          {t('platforms', STATUS_KEYS[p.status])}
                        </span>
                      </div>

                      {(p.followers !== null || p.popularity !== null) && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          {p.followers !== null && (
                            <div className="rounded-lg border border-zinc-800 bg-black/30 px-4 py-2">
                              <p className="text-xs uppercase tracking-wide text-zinc-500">
                                {t('platforms', 'followers')}
                              </p>
                              <p className="text-xl font-semibold text-cyan">
                                {p.followers.toLocaleString(locale)}
                              </p>
                            </div>
                          )}
                          {p.popularity !== null && (
                            <div className="rounded-lg border border-zinc-800 bg-black/30 px-4 py-2">
                              <p className="text-xs uppercase tracking-wide text-zinc-500">
                                {t('platforms', 'popularity')}
                              </p>
                              <p className="text-xl font-semibold text-gold">{p.popularity}/100</p>
                            </div>
                          )}
                          {p.metricsUpdatedAt && (
                            <p className="self-end text-sm text-zinc-600">
                              {t('platforms', 'lastUpdated')}{' '}
                              {new Date(p.metricsUpdatedAt).toLocaleDateString(locale)}
                            </p>
                          )}
                        </div>
                      )}

                      {isEditing ? (
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="mb-1 block text-sm uppercase tracking-wide text-zinc-500">
                              {p.autoMetrics ? t('platforms', 'spotifyId') : t('platforms', 'profileUrl')}
                            </label>
                            <input
                              className="w-full rounded-md border border-zinc-700 bg-black/40 px-3 py-2 text-base outline-none focus:border-magenta"
                              value={p.autoMetrics ? draft.externalId : draft.profileUrl}
                              onChange={(e) =>
                                setDraft((d) =>
                                  p.autoMetrics
                                    ? { ...d, externalId: e.target.value, profileUrl: e.target.value }
                                    : { ...d, profileUrl: e.target.value }
                                )
                              }
                              placeholder="https://..."
                            />
                            {p.autoMetrics && (
                              <p className="mt-1 text-sm text-zinc-500">{t('platforms', 'spotifyIdHint')}</p>
                            )}
                          </div>
                          <div>
                            <label className="mb-1 block text-sm uppercase tracking-wide text-zinc-500">
                              {t('platforms', 'notesLabel')}
                            </label>
                            <textarea
                              className="h-20 w-full rounded-md border border-zinc-700 bg-black/40 px-3 py-2 text-base outline-none focus:border-magenta"
                              value={draft.notes}
                              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                              placeholder={t('platforms', 'notesPlaceholder')}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => save(p, p.status)}
                              className="rounded-md bg-gradient-to-r from-magenta to-cyan px-4 py-2 text-sm font-semibold text-black"
                            >
                              {t('common', 'save')}
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
                            >
                              {t('common', 'cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {p.notes && <p className="mt-3 text-sm text-zinc-500">{p.notes}</p>}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(['not_claimed', 'pending', 'claimed', 'verified'] as Status[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => save(p, s)}
                                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                                  p.status === s ? STATUS_STYLE[s] : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
                                }`}
                              >
                                {t('platforms', STATUS_KEYS[s])}
                              </button>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a
                              href={p.profileUrl || p.manageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md bg-gradient-to-r from-magenta to-cyan px-4 py-2 text-sm font-semibold text-black"
                            >
                              {t('platforms', 'open')} ↗
                            </a>
                            <button
                              onClick={() => {
                                setEditing(p.id);
                                setDraft({
                                  profileUrl: p.profileUrl || '',
                                  externalId: p.externalId || '',
                                  notes: p.notes || '',
                                });
                              }}
                              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-magenta hover:text-white"
                            >
                              {t('platforms', 'edit')}
                            </button>
                            {p.autoMetrics && p.externalId && (
                              <button
                                onClick={() => refresh(p)}
                                disabled={refreshing === p.id}
                                className="rounded-md border border-cyan/40 px-4 py-2 text-sm text-cyan disabled:opacity-50"
                              >
                                {refreshing === p.id ? t('platforms', 'refreshing') : t('platforms', 'refresh')}
                              </button>
                            )}
                          </div>
                          {p.updatedBy && p.updatedAt && (
                            <p className="mt-3 text-sm text-zinc-600">
                              {t('milestones', 'updatedBy')} {p.updatedBy} ·{' '}
                              {new Date(p.updatedAt).toLocaleDateString(locale)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
