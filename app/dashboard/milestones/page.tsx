'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { TRANSLATIONS } from '@/lib/i18n';

type Status = 'not_started' | 'in_progress' | 'done';

interface Milestone {
  id: number;
  slug: string;
  category: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  priority: 'high' | 'medium' | 'low';
  status: Status;
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

interface Guide {
  summary: string;
  budgetLow: number;
  budgetHigh: number;
  budgetNote: string;
  timeline: string;
  steps: { title: string; detail: string; who: string }[];
  pitfalls: string[];
  doneWhen: string;
}

const CATEGORY_KEYS: Record<string, keyof typeof TRANSLATIONS.milestones> = {
  royalties: 'catRoyalties',
  rights: 'catRights',
  sync: 'catSync',
  platforms: 'catPlatforms',
  business: 'catBusiness',
};

const CATEGORY_ORDER = ['royalties', 'rights', 'sync', 'platforms', 'business'];

const STATUS_KEYS: Record<Status, keyof typeof TRANSLATIONS.milestones> = {
  not_started: 'statusNotStarted',
  in_progress: 'statusInProgress',
  done: 'statusDone',
};

const PRIORITY_KEYS: Record<string, keyof typeof TRANSLATIONS.milestones> = {
  high: 'priorityHigh',
  medium: 'priorityMedium',
  low: 'priorityLow',
};

export default function MilestonesPage() {
  const { t, lang } = useLanguage();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [guides, setGuides] = useState<Record<number, Guide | null>>({});
  const [generating, setGenerating] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/milestones');
    const data = await res.json();
    setMilestones(data.milestones || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(m: Milestone, status: Status) {
    await fetch(`/api/milestones/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes: noteDraft[m.id] ?? m.notes }),
    });
    load();
  }

  async function saveNotes(m: Milestone) {
    await fetch(`/api/milestones/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: m.status, notes: noteDraft[m.id] ?? '' }),
    });
    load();
  }

  async function toggleExpand(m: Milestone) {
    if (expanded === m.id) {
      setExpanded(null);
      return;
    }
    setExpanded(m.id);
    if (guides[m.id] === undefined) {
      const res = await fetch(`/api/milestones/${m.id}/guide?lang=${lang}`);
      const data = await res.json();
      setGuides((g) => ({ ...g, [m.id]: data.guide }));
    }
  }

  async function generateGuide(m: Milestone) {
    setGenerating(m.id);
    setError('');
    try {
      const res = await fetch(`/api/milestones/${m.id}/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setGuides((g) => ({ ...g, [m.id]: data.guide }));
    } finally {
      setGenerating(null);
    }
  }

  const doneCount = milestones.filter((m) => m.status === 'done').length;
  const pct = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;

  function money(n: number) {
    return n === 0 ? t('milestones', 'free') : `$${n.toLocaleString()}`;
  }

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl tracking-wide text-white">{t('milestones', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('milestones', 'subtitle')}</p>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm uppercase tracking-wide text-zinc-400">{t('milestones', 'progress')}</p>
          <p className="text-base text-white">
            {doneCount} / {milestones.length}
          </p>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-magenta to-cyan transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-magenta/40 bg-magenta/10 px-4 py-3 text-base text-magenta">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-lg text-zinc-400">{t('common', 'loading')}</p>
      ) : (
        CATEGORY_ORDER.filter((cat) => milestones.some((m) => m.category === cat)).map((cat) => (
          <div key={cat} className="mt-8">
            <h2 className="text-sm uppercase tracking-wide text-gold">
              {CATEGORY_KEYS[cat] ? t('milestones', CATEGORY_KEYS[cat]) : cat}
            </h2>
            <div className="mt-3 space-y-4">
              {milestones
                .filter((m) => m.category === cat)
                .map((m) => {
                  const guide = guides[m.id];
                  const isOpen = expanded === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border bg-panel p-6 ${
                        m.status === 'done' ? 'border-cyan/30' : 'border-zinc-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`text-lg font-semibold ${
                                m.status === 'done' ? 'text-zinc-500 line-through' : 'text-white'
                              }`}
                            >
                              {lang === 'es' ? m.title_es : m.title_en}
                            </p>
                            {m.priority === 'high' && m.status !== 'done' && (
                              <span className="rounded-full bg-magenta/20 px-2.5 py-0.5 text-xs text-magenta">
                                {t('milestones', PRIORITY_KEYS[m.priority])}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-base leading-relaxed text-zinc-400">
                            {lang === 'es' ? m.description_es : m.description_en}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(['not_started', 'in_progress', 'done'] as Status[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(m, s)}
                            className={`rounded-full border px-4 py-1.5 text-sm transition ${
                              m.status === s
                                ? s === 'done'
                                  ? 'border-cyan bg-cyan/10 text-cyan'
                                  : s === 'in_progress'
                                  ? 'border-gold bg-gold/10 text-gold'
                                  : 'border-zinc-500 bg-white/5 text-zinc-200'
                                : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
                            }`}
                          >
                            {t('milestones', STATUS_KEYS[s])}
                          </button>
                        ))}
                        <button
                          onClick={() => toggleExpand(m)}
                          className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:border-magenta hover:text-white"
                        >
                          {isOpen ? t('milestones', 'hideGuide') : t('milestones', 'showGuide')}
                        </button>
                      </div>

                      {m.updatedBy && m.updatedAt && (
                        <p className="mt-3 text-sm text-zinc-600">
                          {t('milestones', 'updatedBy')} {m.updatedBy} ·{' '}
                          {new Date(m.updatedAt).toLocaleDateString(lang === 'es' ? 'es-EC' : 'en-US')}
                        </p>
                      )}

                      {isOpen && (
                        <div className="mt-5 border-t border-zinc-800 pt-5">
                          {!guide ? (
                            <button
                              onClick={() => generateGuide(m)}
                              disabled={generating === m.id}
                              className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-3 text-base font-semibold text-black disabled:opacity-50"
                            >
                              {generating === m.id
                                ? t('milestones', 'generatingGuide')
                                : `✨ ${t('milestones', 'generateGuide')}`}
                            </button>
                          ) : (
                            <div className="space-y-5">
                              <p className="text-base leading-relaxed text-zinc-200">{guide.summary}</p>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                                  <p className="text-sm uppercase tracking-wide text-zinc-500">
                                    {t('milestones', 'estimatedBudget')}
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold text-cyan">
                                    {guide.budgetLow === guide.budgetHigh
                                      ? money(guide.budgetLow)
                                      : `${money(guide.budgetLow)} – ${money(guide.budgetHigh)}`}
                                  </p>
                                  <p className="mt-2 text-sm text-zinc-500">{guide.budgetNote}</p>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                                  <p className="text-sm uppercase tracking-wide text-zinc-500">
                                    {t('milestones', 'timeline')}
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold text-gold">{guide.timeline}</p>
                                </div>
                              </div>

                              <div>
                                <p className="mb-3 text-sm uppercase tracking-wide text-zinc-400">
                                  {t('milestones', 'steps')}
                                </p>
                                <ol className="space-y-3">
                                  {guide.steps.map((s, i) => (
                                    <li key={i} className="rounded-lg border border-zinc-800 bg-black/20 p-4">
                                      <p className="text-base font-semibold text-white">
                                        {i + 1}. {s.title}
                                      </p>
                                      <p className="mt-1 text-base leading-relaxed text-zinc-400">{s.detail}</p>
                                      {s.who && (
                                        <p className="mt-2 text-sm text-cyan">
                                          {t('milestones', 'owner')}: {s.who}
                                        </p>
                                      )}
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              {guide.pitfalls?.length > 0 && (
                                <div className="rounded-lg border border-magenta/30 bg-magenta/5 p-4">
                                  <p className="mb-2 text-sm uppercase tracking-wide text-magenta">
                                    {t('milestones', 'pitfalls')}
                                  </p>
                                  <ul className="list-inside list-disc space-y-1 text-base text-zinc-300">
                                    {guide.pitfalls.map((p, i) => (
                                      <li key={i}>{p}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-4">
                                <p className="text-sm uppercase tracking-wide text-cyan">
                                  {t('milestones', 'doneWhen')}
                                </p>
                                <p className="mt-1 text-base text-zinc-200">{guide.doneWhen}</p>
                              </div>

                              <p className="text-sm italic text-zinc-600">⚠ {t('milestones', 'aiDisclaimer')}</p>

                              <button
                                onClick={() => generateGuide(m)}
                                disabled={generating === m.id}
                                className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-magenta hover:text-white disabled:opacity-50"
                              >
                                {generating === m.id
                                  ? t('milestones', 'generatingGuide')
                                  : t('milestones', 'regenerateGuide')}
                              </button>
                            </div>
                          )}

                          <div className="mt-6">
                            <p className="mb-2 text-sm uppercase tracking-wide text-zinc-400">
                              {t('milestones', 'notes')}
                            </p>
                            <textarea
                              className="h-20 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
                              placeholder={t('milestones', 'notesPlaceholder')}
                              value={noteDraft[m.id] ?? m.notes ?? ''}
                              onChange={(e) => setNoteDraft((n) => ({ ...n, [m.id]: e.target.value }))}
                            />
                            <button
                              onClick={() => saveNotes(m)}
                              className="mt-2 rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-magenta hover:text-white"
                            >
                              {t('milestones', 'saveNotes')}
                            </button>
                          </div>
                        </div>
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
