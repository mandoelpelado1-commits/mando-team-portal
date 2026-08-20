'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { TRANSLATIONS } from '@/lib/i18n';

interface VenueSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

type ShowStatus = 'prospecting' | 'pitched' | 'negotiating' | 'confirmed' | 'completed' | 'cancelled';

interface Show {
  id: number;
  venue_name: string;
  city: string | null;
  country: string | null;
  target_date: string | null;
  capacity: number | null;
  fee_offered: number | null;
  status: ShowStatus;
  notes: string | null;
  pitch_draft: string | null;
  updated_at: string;
}

const STATUS_KEYS: Record<ShowStatus, keyof typeof TRANSLATIONS.shows> = {
  prospecting: 'statusProspecting',
  pitched: 'statusPitched',
  negotiating: 'statusNegotiating',
  confirmed: 'statusConfirmed',
  completed: 'statusCompleted',
  cancelled: 'statusCancelled',
};
const STATUS_ORDER: ShowStatus[] = ['prospecting', 'pitched', 'negotiating', 'confirmed', 'completed', 'cancelled'];
const STATUS_STYLE: Record<ShowStatus, string> = {
  prospecting: 'border-zinc-700 text-zinc-400',
  pitched: 'border-gold bg-gold/10 text-gold',
  negotiating: 'border-cyan bg-cyan/10 text-cyan',
  confirmed: 'border-cyan bg-cyan/20 text-cyan',
  completed: 'border-cyan bg-cyan/20 text-cyan',
  cancelled: 'border-zinc-800 text-zinc-600',
};

export default function ShowsPage() {
  const { t, lang } = useLanguage();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ venueName: '', city: '', country: '', targetDate: '', capacity: '', feeOffered: '' });
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const venueDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const venueRequestSeq = useRef(0);

  function onVenueNameChange(value: string) {
    setForm((f) => ({ ...f, venueName: value }));
    setShowSuggestions(true);
    if (venueDebounce.current) clearTimeout(venueDebounce.current);
    if (value.trim().length < 3) {
      setVenueSuggestions([]);
      return;
    }
    venueDebounce.current = setTimeout(async () => {
      const seq = ++venueRequestSeq.current;
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (seq !== venueRequestSeq.current) return; // a newer keystroke already fired
        setVenueSuggestions(data.suggestions || []);
      } catch {
        if (seq === venueRequestSeq.current) setVenueSuggestions([]);
      }
    }, 300);
  }

  async function pickVenue(s: VenueSuggestion) {
    setShowSuggestions(false);
    setVenueSuggestions([]);
    setForm((f) => ({ ...f, venueName: s.mainText }));
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(s.placeId)}`);
      const data = await res.json();
      if (res.ok && data.details) {
        setForm((f) => ({
          ...f,
          venueName: data.details.name || f.venueName,
          city: data.details.city || f.city,
          country: data.details.country || f.country,
        }));
      }
    } catch {
      // Venue name is already filled in; city/country stay blank if lookup fails.
    }
  }

  async function load() {
    setLoading(true);
    const res = await fetch('/api/shows');
    const data = await res.json();
    setShows(data.shows || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createShow() {
    setError('');
    if (!form.venueName.trim()) return;
    const res = await fetch('/api/shows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setForm({ venueName: '', city: '', country: '', targetDate: '', capacity: '', feeOffered: '' });
    setShowForm(false);
    load();
  }

  async function setStatus(s: Show, status: ShowStatus) {
    await fetch(`/api/shows/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function generatePitch(s: Show) {
    setGenerating(s.id);
    setError('');
    try {
      const res = await fetch(`/api/shows/${s.id}/pitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      load();
    } finally {
      setGenerating(null);
    }
  }

  function copyPitch(s: Show) {
    if (!s.pitch_draft) return;
    navigator.clipboard.writeText(s.pitch_draft);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide text-white">{t('shows', 'title')}</h1>
          <p className="mt-2 text-base text-zinc-400">{t('shows', 'subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black"
        >
          + {t('shows', 'addShow')}
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative sm:col-span-2">
              <input
                className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
                placeholder={t('shows', 'venueName')}
                value={form.venueName}
                onChange={(e) => onVenueNameChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
              />
              {showSuggestions && venueSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-zinc-700 bg-ink shadow-lg">
                  {venueSuggestions.map((s) => (
                    <button
                      key={s.placeId}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickVenue(s)}
                      className="block w-full px-4 py-2.5 text-left text-base hover:bg-zinc-800"
                    >
                      <span className="text-white">{s.mainText}</span>
                      {s.secondaryText && <span className="ml-2 text-sm text-zinc-500">{s.secondaryText}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('shows', 'city')}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('shows', 'country')}
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
            <div>
              <label className="mb-1 block text-sm text-zinc-500">{t('shows', 'targetDate')}</label>
              <input
                type="date"
                className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
                value={form.targetDate}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
              />
            </div>
            <input
              type="number"
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('shows', 'capacity')}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
            <input
              type="number"
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('shows', 'fee')}
              value={form.feeOffered}
              onChange={(e) => setForm((f) => ({ ...f, feeOffered: e.target.value }))}
            />
          </div>
          {error && <p className="mt-3 text-base text-magenta">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={createShow} className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black">
              {t('common', 'save')}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-5 py-2.5 text-base text-zinc-400">
              {t('common', 'cancel')}
            </button>
          </div>
        </div>
      )}

      {error && !showForm && <p className="mt-4 text-base text-magenta">{error}</p>}

      {loading ? (
        <p className="mt-6 text-lg text-zinc-400">{t('common', 'loading')}</p>
      ) : shows.length === 0 ? (
        <p className="mt-6 text-base text-zinc-500">{t('shows', 'noShows')}</p>
      ) : (
        <div className="mt-6 space-y-5">
          {shows.map((s) => (
            <div key={s.id} className="rounded-xl border border-zinc-800 bg-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-white">{s.venue_name}</p>
                  <p className="text-sm text-zinc-500">
                    {[s.city, s.country].filter(Boolean).join(', ')}
                    {s.target_date ? ` · ${new Date(s.target_date).toLocaleDateString(locale)}` : ''}
                    {s.capacity ? ` · ${s.capacity.toLocaleString(locale)} cap` : ''}
                    {s.fee_offered ? ` · $${s.fee_offered.toLocaleString(locale)}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {STATUS_ORDER.map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatus(s, st)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                      s.status === st ? STATUS_STYLE[st] : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'
                    }`}
                  >
                    {t('shows', STATUS_KEYS[st])}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <button
                  onClick={() => generatePitch(s)}
                  disabled={generating === s.id}
                  className="rounded-md border border-cyan/40 px-4 py-2 text-sm text-cyan disabled:opacity-50"
                >
                  {generating === s.id ? t('shows', 'generating') : `✨ ${t('shows', 'generatePitch')}`}
                </button>
              </div>

              {s.pitch_draft && (
                <div className="mt-4 rounded-lg border border-zinc-800 bg-black/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm uppercase tracking-wide text-zinc-500">{t('shows', 'pitchDraft')}</p>
                    <button onClick={() => copyPitch(s)} className="text-sm text-cyan hover:underline">
                      {copiedId === s.id ? t('shows', 'copied') : t('shows', 'copyPitch')}
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-base text-zinc-200">{s.pitch_draft}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
