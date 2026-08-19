'use client';

import { useRef, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Lang } from '@/lib/i18n';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X' },
];

interface GeneratedPost {
  platform: string;
  caption: string;
  hashtags: string[];
  suggested_day: string;
  suggested_time: string;
}

interface Media {
  url: string;
  mediaType: 'image' | 'video';
  name: string;
  size: number;
}

export default function GeneratePage() {
  const { t, lang } = useLanguage();
  const fileInput = useRef<HTMLInputElement>(null);

  const [gamePlan, setGamePlan] = useState('');
  const [tone, setTone] = useState('');
  const [selected, setSelected] = useState<string[]>(['instagram', 'tiktok']);
  const [captionLang, setCaptionLang] = useState<Lang>(lang);
  const [media, setMedia] = useState<Media | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<GeneratedPost[] | null>(null);

  function togglePlatform(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setMedia({ url: data.url, mediaType: data.mediaType, name: data.name, size: data.size });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gamePlan,
          tone: tone || t('generate', 'toneDefault'),
          platforms: selected,
          language: captionLang,
          mediaUrl: media?.url ?? null,
          mediaType: media?.mediaType ?? null,
          linkUrl: linkUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }
      setResults(data.posts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl tracking-wide text-white">{t('generate', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('generate', 'subtitle')}</p>

      <div className="mt-6 max-w-2xl rounded-xl border border-zinc-800 bg-panel p-6">
        <label className="mb-2 block text-sm uppercase tracking-wide text-zinc-400">
          {t('generate', 'gamePlan')}
        </label>
        <textarea
          className="h-36 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
          placeholder={t('generate', 'gamePlanPlaceholder')}
          value={gamePlan}
          onChange={(e) => setGamePlan(e.target.value)}
        />

        {/* Media upload */}
        <label className="mb-2 mt-5 block text-sm uppercase tracking-wide text-zinc-400">
          {t('generate', 'media')}
        </label>
        {media ? (
          <div className="rounded-lg border border-cyan/40 bg-cyan/5 p-4">
            <div className="flex flex-wrap items-center gap-4">
              {media.mediaType === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.url} alt="" className="h-24 w-24 rounded-md object-cover" />
              ) : (
                <video src={media.url} className="h-24 w-24 rounded-md object-cover" muted playsInline />
              )}
              <div className="min-w-0 flex-1">
                <p className="break-anywhere text-base text-white">{media.name}</p>
                <p className="text-sm text-zinc-500">
                  {media.mediaType === 'video' ? '🎬' : '🖼'} {(media.size / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>
              <button
                onClick={() => setMedia(null)}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:border-magenta hover:text-white"
              >
                {t('generate', 'removeMedia')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              onChange={handleFile}
              className="hidden"
              id="media-upload"
            />
            <label
              htmlFor="media-upload"
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-600 px-5 py-3 text-base text-zinc-300 hover:border-cyan hover:text-white ${
                uploading ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {uploading ? t('generate', 'uploading') : `📎 ${t('generate', 'chooseFile')}`}
            </label>
            <p className="mt-2 text-sm text-zinc-500">{t('generate', 'mediaHint')}</p>
          </div>
        )}

        {/* Link */}
        <label className="mb-2 mt-5 block text-sm uppercase tracking-wide text-zinc-400">
          {t('generate', 'link')}
        </label>
        <input
          type="url"
          className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
          placeholder={t('generate', 'linkPlaceholder')}
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />
        {linkUrl.trim() && <p className="mt-2 text-sm text-gold">{t('generate', 'linkNote')}</p>}

        <label className="mb-2 mt-5 block text-sm uppercase tracking-wide text-zinc-400">
          {t('generate', 'tone')}
        </label>
        <input
          className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
          placeholder={t('generate', 'toneDefault')}
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        />

        <label className="mb-2 mt-5 block text-sm uppercase tracking-wide text-zinc-400">
          {t('generate', 'captionLang')}
        </label>
        <div className="flex gap-2">
          {(['es', 'en'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setCaptionLang(l)}
              className={`rounded-full border px-5 py-2 text-base transition ${
                captionLang === l
                  ? 'border-cyan bg-cyan/10 text-cyan'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {l === 'es' ? '🇪🇨 Español' : '🇺🇸 English'}
            </button>
          ))}
        </div>

        <label className="mb-2 mt-5 block text-sm uppercase tracking-wide text-zinc-400">
          {t('generate', 'platforms')}
        </label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePlatform(p.id)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                selected.includes(p.id)
                  ? 'border-cyan bg-cyan/10 text-cyan'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-base text-magenta">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={loading || uploading || !gamePlan || selected.length === 0}
          className="mt-6 w-full rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-4 text-lg font-semibold text-black disabled:opacity-50"
        >
          {loading ? t('generate', 'generating') : `✨ ${t('generate', 'generateBtn')}`}
        </button>
      </div>

      {results && (
        <div className="mt-6 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
          {results.map((post, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-panel p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm uppercase tracking-wide text-gold">{post.platform}</p>
                {media && (
                  <span className="text-sm text-zinc-500">{media.mediaType === 'video' ? '🎬' : '🖼'}</span>
                )}
              </div>
              {media && (
                <div className="mt-3">
                  {media.mediaType === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media.url} alt="" className="h-32 w-full rounded-md object-cover" />
                  ) : (
                    <video src={media.url} className="h-32 w-full rounded-md object-cover" muted playsInline />
                  )}
                </div>
              )}
              <p className="mt-3 whitespace-pre-wrap text-base text-zinc-200">{post.caption}</p>
              <p className="mt-3 text-sm text-cyan">
                {post.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
              </p>
              {linkUrl.trim() && (
                <p className="break-anywhere mt-2 text-sm text-zinc-500">🔗 {linkUrl.trim()}</p>
              )}
              <p className="mt-4 text-sm text-zinc-500">
                {t('generate', 'suggested')} {post.suggested_day} {t('generate', 'at')} {post.suggested_time}{' '}
                {t('generate', 'ecuadorTime')}
              </p>
            </div>
          ))}
        </div>
      )}
      {results && (
        <p className="mt-4 text-base text-zinc-400">
          {t('generate', 'savedAsDrafts')}{' '}
          <a className="text-cyan underline" href="/dashboard/schedule">
            {t('generate', 'schedulePage')}
          </a>
          {t('generate', 'page')}
        </p>
      )}
    </div>
  );
}
