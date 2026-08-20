'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { TRANSLATIONS } from '@/lib/i18n';

type Status = 'not_started' | 'in_progress' | 'done';

interface Goal {
  id: number;
  title: string;
  notes: string | null;
  status: Status;
  dueDate: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

const STATUS_KEYS: Record<Status, keyof typeof TRANSLATIONS.mandoAvispate> = {
  not_started: 'statusNotStarted',
  in_progress: 'statusInProgress',
  done: 'statusDone',
};

export default function MandoAvispatePage() {
  const { t, lang } = useLanguage();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [posting, setPosting] = useState(false);

  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  async function load() {
    setLoading(true);
    const res = await fetch('/api/mando-goals');
    const data = await res.json();
    setGoals(data.goals || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addGoal() {
    if (!title.trim()) return;
    setPosting(true);
    await fetch('/api/mando-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), notes: notes.trim() || null, dueDate: dueDate || null }),
    });
    setTitle('');
    setNotes('');
    setDueDate('');
    setPosting(false);
    load();
  }

  async function setStatus(g: Goal, status: Status) {
    await fetch(`/api/mando-goals/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function removeGoal(id: number) {
    await fetch(`/api/mando-goals/${id}`, { method: 'DELETE' });
    load();
  }

  const doneCount = goals.filter((g) => g.status === 'done').length;
  const pct = goals.length ? Math.round((doneCount / goals.length) * 100) : 0;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl tracking-wide text-white">{t('mandoAvispate', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('mandoAvispate', 'subtitle')}</p>

      {goals.length > 0 && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-wide text-zinc-400">{t('mandoAvispate', 'progress')}</p>
            <p className="text-base text-white">
              {doneCount} / {goals.length}
            </p>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-magenta to-cyan transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
        <label className="mb-2 block text-sm uppercase tracking-wide text-zinc-400">{t('mandoAvispate', 'newGoal')}</label>
        <input
          className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
          placeholder={t('mandoAvispate', 'titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <textarea
            className="h-20 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
            placeholder={t('mandoAvispate', 'notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm text-zinc-500">{t('mandoAvispate', 'dueDate')}</label>
            <input
              type="date"
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={addGoal}
          disabled={posting || !title.trim()}
          className="mt-4 rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black disabled:opacity-50"
        >
          {posting ? t('mandoAvispate', 'posting') : t('mandoAvispate', 'add')}
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-lg text-zinc-400">{t('common', 'loading')}</p>
      ) : (
        <div className="mt-8 space-y-4">
          {goals.length === 0 && <p className="text-base text-zinc-500">{t('mandoAvispate', 'noGoals')}</p>}
          {goals.map((g) => (
            <div
              key={g.id}
              className={`rounded-xl border bg-panel p-6 ${g.status === 'done' ? 'border-cyan/30' : 'border-zinc-800'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <p className={`text-lg font-semibold ${g.status === 'done' ? 'text-zinc-500 line-through' : 'text-white'}`}>
                    {g.title}
                  </p>
                  {g.notes && <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-zinc-400">{g.notes}</p>}
                  {g.dueDate && (
                    <p className="mt-2 text-sm text-gold">
                      {t('mandoAvispate', 'dueDate')}: {new Date(g.dueDate + 'T00:00:00').toLocaleDateString(locale)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeGoal(g.id)}
                  className="shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-500 hover:border-magenta hover:text-magenta"
                >
                  {t('common', 'remove')}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(['not_started', 'in_progress', 'done'] as Status[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(g, s)}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${
                      g.status === s
                        ? s === 'done'
                          ? 'border-cyan bg-cyan/10 text-cyan'
                          : s === 'in_progress'
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-zinc-500 bg-white/5 text-zinc-200'
                        : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
                    }`}
                  >
                    {t('mandoAvispate', STATUS_KEYS[s])}
                  </button>
                ))}
              </div>

              {g.updatedBy && (
                <p className="mt-3 text-sm text-zinc-600">
                  {t('mandoAvispate', 'updatedBy')} {g.updatedBy} · {new Date(g.updatedAt).toLocaleDateString(locale)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
