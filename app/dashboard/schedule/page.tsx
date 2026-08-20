'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { TRANSLATIONS } from '@/lib/i18n';

interface CalendarStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
}

interface Post {
  id: number;
  platform: string;
  caption: string;
  hashtags: string | null;
  scheduled_for: string | null;
  status: string;
  media_url: string | null;
  media_type: string | null;
  link_url: string | null;
}

const STATUS_KEYS: Record<string, keyof typeof TRANSLATIONS.schedule> = {
  draft: 'statusDraft',
  scheduled: 'statusScheduled',
  published: 'statusPublished',
  failed: 'statusFailed',
  publishing: 'statusPublishing',
};

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function SchedulePage() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [calendarNotice, setCalendarNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [schedulingId, setSchedulingId] = useState<number | null>(null);
  const [dateInput, setDateInput] = useState('');
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);

  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  async function load() {
    setLoading(true);
    const res = await fetch('/api/schedule');
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  }

  async function loadCalendarStatus() {
    const res = await fetch('/api/calendar/google/status');
    if (res.ok) setCalendar(await res.json());
  }

  async function disconnectCalendar() {
    await fetch('/api/calendar/google/disconnect', { method: 'POST' });
    loadCalendarStatus();
  }

  useEffect(() => {
    load();
    loadCalendarStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get('connected') === 'google_calendar') setCalendarNotice(t('schedule', 'calendarConnected'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const drafts = posts.filter((p) => p.status === 'draft');
  const weekStart = startOfWeek(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  async function schedulePost(id: number) {
    if (!dateInput) return;
    await fetch(`/api/schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledFor: new Date(dateInput).toISOString() }),
    });
    setSchedulingId(null);
    setDateInput('');
    load();
  }

  async function unschedule(id: number) {
    await fetch(`/api/schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    });
    load();
  }

  if (loading) return <p className="text-lg text-zinc-400">{t('common', 'loading')}</p>;

  return (
    <div>
      <h1 className="font-display text-4xl tracking-wide text-white">{t('schedule', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('schedule', 'subtitle')}</p>

      <div className="mt-5 rounded-xl border border-zinc-800 bg-panel p-5">
        {calendar?.connected ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-base text-zinc-300">
              📅 {t('schedule', 'calendarConnectedAs')} <span className="text-cyan">{calendar.email}</span>
            </span>
            <button onClick={disconnectCalendar} className="text-sm text-zinc-500 underline hover:text-zinc-300">
              {t('common', 'disconnect')}
            </button>
          </div>
        ) : calendar?.configured ? (
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/api/calendar/google/connect"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-600 px-5 py-2.5 text-base text-zinc-300 hover:border-cyan hover:text-white"
            >
              📅 {t('schedule', 'connectCalendar')}
            </a>
            <span className="text-sm text-zinc-500">{t('schedule', 'calendarHint')}</span>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">{t('schedule', 'calendarNotConfigured')}</p>
        )}
        {calendarNotice && <p className="mt-2 text-sm text-cyan">{calendarNotice}</p>}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-panel p-5 xl:col-span-1">
          <p className="mb-4 text-sm uppercase tracking-wide text-zinc-400">
            {t('schedule', 'drafts')} ({drafts.length})
          </p>
          <div className="space-y-4">
            {drafts.length === 0 && <p className="text-base text-zinc-500">{t('schedule', 'noDrafts')}</p>}
            {drafts.map((post) => (
              <div key={post.id} className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <p className="text-sm uppercase text-gold">{post.platform} {post.media_type === 'video' ? '🎬' : post.media_type === 'image' ? '🖼' : ''}{post.link_url ? ' 🔗' : ''}</p>
                <p className="mt-2 line-clamp-3 text-sm text-zinc-300">{post.caption}</p>
                {schedulingId === post.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="datetime-local"
                      className="rounded border border-zinc-700 bg-black/40 px-3 py-2 text-sm"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => schedulePost(post.id)}
                        className="rounded bg-cyan/20 px-3 py-1.5 text-sm text-cyan"
                      >
                        {t('common', 'confirm')}
                      </button>
                      <button
                        onClick={() => setSchedulingId(null)}
                        className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400"
                      >
                        {t('common', 'cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSchedulingId(post.id)}
                    className="mt-3 rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-magenta"
                  >
                    {t('schedule', 'placeOnCalendar')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:col-span-3 xl:grid-cols-4 2xl:grid-cols-7">
          {days.map((day) => {
            const dayPosts = posts.filter(
              (p) => p.scheduled_for && new Date(p.scheduled_for).toDateString() === day.toDateString()
            );
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={day.toISOString()}
                className={`rounded-xl border bg-panel ${isToday ? 'border-magenta/40' : 'border-zinc-800'} ${
                  // Empty days collapse to a slim row on phones so the whole week
                  // still reads at a glance without endless scrolling.
                  dayPosts.length === 0 ? 'px-4 py-2.5 sm:p-4' : 'p-4'
                }`}
              >
                <p className={`text-sm uppercase tracking-wide ${isToday ? 'text-magenta' : 'text-zinc-400'}`}>
                  {day.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <div className="mt-3 space-y-3">
                  {dayPosts.map((post) => (
                    <div key={post.id} className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                      <p className="text-xs uppercase text-gold">{post.platform} {post.media_type === 'video' ? '🎬' : post.media_type === 'image' ? '🖼' : ''}{post.link_url ? ' 🔗' : ''}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(post.scheduled_for!).toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{post.caption}</p>
                      <span
                        className={`mt-2 inline-block rounded px-2 py-1 text-xs ${
                          post.status === 'published'
                            ? 'bg-cyan/20 text-cyan'
                            : post.status === 'failed'
                            ? 'bg-magenta/20 text-magenta'
                            : 'bg-gold/20 text-gold'
                        }`}
                      >
                        {STATUS_KEYS[post.status] ? t('schedule', STATUS_KEYS[post.status]) : post.status}
                      </span>
                      {post.status === 'scheduled' && (
                        <button
                          onClick={() => unschedule(post.id)}
                          className="mt-2 block text-xs text-zinc-500 underline hover:text-zinc-300"
                        >
                          {t('schedule', 'unschedule')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
