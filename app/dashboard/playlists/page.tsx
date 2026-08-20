'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { TRANSLATIONS } from '@/lib/i18n';

type PlaylistStatus = 'pitched' | 'added' | 'removed';

interface PlaylistEntry {
  id: number;
  name: string;
  platform: string;
  curator: string | null;
  song_title: string | null;
  followers: number | null;
  url: string | null;
  status: PlaylistStatus;
  date_added: string | null;
  updated_at: string;
}

const STATUS_KEYS: Record<PlaylistStatus, keyof typeof TRANSLATIONS.playlists> = {
  pitched: 'statusPitched',
  added: 'statusAdded',
  removed: 'statusRemoved',
};
const STATUS_STYLE: Record<PlaylistStatus, string> = {
  pitched: 'border-gold bg-gold/10 text-gold',
  added: 'border-cyan bg-cyan/20 text-cyan',
  removed: 'border-zinc-800 text-zinc-600',
};

export default function PlaylistsPage() {
  const { t, lang } = useLanguage();
  const [playlists, setPlaylists] = useState<PlaylistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', platform: 'spotify', curator: '', songTitle: '', followers: '', url: '' });
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/playlists');
    const data = await res.json();
    setPlaylists(data.playlists || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createEntry() {
    setError('');
    if (!form.name.trim()) return;
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setForm({ name: '', platform: 'spotify', curator: '', songTitle: '', followers: '', url: '' });
    setShowForm(false);
    load();
  }

  async function setStatus(p: PlaylistEntry, status: PlaylistStatus) {
    await fetch(`/api/playlists/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, dateAdded: status === 'added' ? new Date().toISOString().slice(0, 10) : p.date_added }),
    });
    load();
  }

  async function remove(p: PlaylistEntry) {
    await fetch(`/api/playlists/${p.id}`, { method: 'DELETE' });
    load();
  }

  const locale = lang === 'es' ? 'es-EC' : 'en-US';
  const totalAdded = playlists.filter((p) => p.status === 'added').length;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide text-white">{t('playlists', 'title')}</h1>
          <p className="mt-2 text-base text-zinc-400">{t('playlists', 'subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black"
        >
          + {t('playlists', 'addPlaylist')}
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-cyan/30 bg-panel p-5">
        <p className="text-sm uppercase tracking-wide text-zinc-400">{t('platforms', 'claimed')}</p>
        <p className="mt-1 text-3xl font-semibold text-cyan">{totalAdded}</p>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('playlists', 'name')}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <select
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
            >
              <option value="spotify">Spotify</option>
              <option value="apple_music">Apple Music</option>
              <option value="youtube_music">YouTube Music</option>
              <option value="other">{lang === 'es' ? 'Otro' : 'Other'}</option>
            </select>
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('playlists', 'curator')}
              value={form.curator}
              onChange={(e) => setForm((f) => ({ ...f, curator: e.target.value }))}
            />
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('playlists', 'song')}
              value={form.songTitle}
              onChange={(e) => setForm((f) => ({ ...f, songTitle: e.target.value }))}
            />
            <input
              type="number"
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('playlists', 'followers')}
              value={form.followers}
              onChange={(e) => setForm((f) => ({ ...f, followers: e.target.value }))}
            />
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('playlists', 'url')}
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </div>
          {error && <p className="mt-3 text-base text-magenta">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={createEntry} className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black">
              {t('common', 'save')}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-5 py-2.5 text-base text-zinc-400">
              {t('common', 'cancel')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-lg text-zinc-400">{t('common', 'loading')}</p>
      ) : playlists.length === 0 ? (
        <p className="mt-6 text-base text-zinc-500">{t('playlists', 'noPlaylists')}</p>
      ) : (
        <div className="mt-6 space-y-3">
          {playlists.map((p) => (
            <div key={p.id} className="rounded-xl border border-zinc-800 bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-cyan hover:underline">
                        {p.name}
                      </a>
                    ) : (
                      p.name
                    )}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {p.platform}
                    {p.curator ? ` · ${p.curator}` : ''}
                    {p.song_title ? ` · "${p.song_title}"` : ''}
                    {p.followers ? ` · ${p.followers.toLocaleString(locale)} followers` : ''}
                    {p.date_added ? ` · ${new Date(p.date_added).toLocaleDateString(locale)}` : ''}
                  </p>
                </div>
                <button onClick={() => remove(p)} className="shrink-0 text-sm text-zinc-600 hover:text-magenta">
                  {t('playlists', 'delete')}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['pitched', 'added', 'removed'] as PlaylistStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(p, s)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                      p.status === s ? STATUS_STYLE[s] : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'
                    }`}
                  >
                    {t('playlists', STATUS_KEYS[s])}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
