'use client';

import { useRef, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Lang } from '@/lib/i18n';

interface EmailDraft {
  subject: string;
  preheader: string;
  greeting: string;
  paragraphs: string[];
  signOff: string;
}

interface Media {
  url: string;
  mediaType: 'image' | 'video';
  name: string;
  size: number;
}

export default function EmailPage() {
  const { t, lang } = useLanguage();
  const fileInput = useRef<HTMLInputElement>(null);
  const [emailLang, setEmailLang] = useState<Lang>(lang);
  const [topic, setTopic] = useState('');
  const [media, setMedia] = useState<Media | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<{ dashboardUrl: string } | null>(null);

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

  async function generate() {
    setGenerating(true);
    setError('');
    setDraft(null);
    setSent(null);
    try {
      const res = await fetch('/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          language: emailLang,
          mediaType: media?.mediaType ?? null,
          linkUrl: linkUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setDraft(data.draft);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function sendToWix() {
    if (!draft) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/email/send-to-wix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: {
            ...draft,
            mediaUrl: media?.url ?? null,
            mediaType: media?.mediaType ?? null,
            linkUrl: linkUrl.trim() || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setSent({ dashboardUrl: data.dashboardUrl });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function startOver() {
    setTopic('');
    setMedia(null);
    setLinkUrl('');
    setDraft(null);
    setSent(null);
    setError('');
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl tracking-wide text-white">{t('email', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('email', 'subtitle')}</p>

      {error && (
        <div className="mt-5 rounded-md border border-magenta/40 bg-magenta/10 px-4 py-3 text-base text-magenta">
          {error}
        </div>
      )}

      {sent ? (
        <div className="mt-6 rounded-xl border border-cyan/40 bg-cyan/5 p-8 text-center">
          <p className="text-2xl font-semibold text-cyan">✓ {t('email', 'successTitle')}</p>
          <p className="mx-auto mt-3 max-w-md text-base text-zinc-300">{t('email', 'successBody')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={sent.dashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-gradient-to-r from-magenta to-cyan px-6 py-3 text-base font-semibold text-black"
            >
              {t('email', 'openWix')}
            </a>
            <button
              onClick={startOver}
              className="rounded-md border border-zinc-700 px-6 py-3 text-base text-zinc-300 hover:border-magenta hover:text-white"
            >
              {t('email', 'startOver')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
            <p className="text-lg font-semibold text-white">{t('email', 'step1')}</p>
            <textarea
              className="mt-4 h-32 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('email', 'placeholder')}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

            {/* Media upload */}
            <label className="mb-2 mt-5 block text-sm uppercase tracking-wide text-zinc-400">
              {t('email', 'media')}
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
                    {media.mediaType === 'video' && (
                      <p className="mt-1 text-sm text-gold">{t('email', 'videoNote')}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setMedia(null)}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:border-magenta hover:text-white"
                  >
                    {t('email', 'removeMedia')}
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
                  id="email-media-upload"
                />
                <label
                  htmlFor="email-media-upload"
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-600 px-5 py-3 text-base text-zinc-300 hover:border-cyan hover:text-white ${
                    uploading ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  {uploading ? t('email', 'uploading') : `📎 ${t('email', 'chooseFile')}`}
                </label>
                <p className="mt-2 text-sm text-zinc-500">{t('email', 'mediaHint')}</p>
              </div>
            )}

            {/* Link */}
            <label className="mb-2 mt-5 block text-sm uppercase tracking-wide text-zinc-400">
              {t('email', 'link')}
            </label>
            <input
              type="url"
              className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('email', 'linkPlaceholder')}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            {linkUrl.trim() && <p className="mt-2 text-sm text-gold">{t('email', 'linkNote')}</p>}

            <p className="mt-5 text-sm uppercase tracking-wide text-zinc-400">{t('email', 'langLabel')}</p>
            <div className="mt-2 flex gap-2">
              {(['es', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setEmailLang(l)}
                  className={`rounded-full border px-5 py-2 text-base transition ${
                    emailLang === l
                      ? 'border-cyan bg-cyan/10 text-cyan'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {l === 'es' ? '🇪🇨 Español' : '🇺🇸 English'}
                </button>
              ))}
            </div>

            <button
              onClick={generate}
              disabled={generating || uploading || !topic.trim()}
              className="mt-6 w-full rounded-md bg-gradient-to-r from-magenta to-cyan px-6 py-4 text-lg font-semibold text-black disabled:opacity-50"
            >
              {generating ? t('email', 'generating') : `✨ ${t('email', 'generate')}`}
            </button>
          </div>

          {draft && (
            <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
              <p className="text-lg font-semibold text-white">{t('email', 'step2')}</p>

              <div className="mt-4">
                <p className="text-sm uppercase tracking-wide text-zinc-400">{t('email', 'subject')}</p>
                <input
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base text-white outline-none focus:border-magenta"
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                />
                <p className="mt-2 text-sm text-zinc-500">{draft.preheader}</p>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm uppercase tracking-wide text-zinc-400">{t('email', 'preview')}</p>
                <div className="rounded-lg bg-white p-6 text-zinc-900">
                  <div className="-mx-6 -mt-6 mb-5 bg-ink px-6 py-4 text-center text-base font-bold tracking-widest text-white">
                    MANDO EL PELADO
                  </div>
                  {media &&
                    (media.mediaType === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={media.url} alt="" className="mb-4 w-full rounded-md object-cover" />
                    ) : (
                      <div className="mb-4 inline-block rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white">
                        ▶ {lang === 'es' ? 'Ver video' : 'Watch the video'}
                      </div>
                    ))}
                  <p className="text-base">{draft.greeting}</p>
                  {draft.paragraphs.map((p, i) => (
                    <p key={i} className="mt-3 text-base leading-relaxed">
                      {p}
                    </p>
                  ))}
                  <p className="mt-4 text-base">{draft.signOff}</p>
                  {linkUrl.trim() && (
                    <div className="mt-5 inline-block rounded-md bg-magenta px-5 py-3 text-sm font-bold text-white">
                      Escúchalo / Listen
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={sendToWix}
                  disabled={sending}
                  className="rounded-md bg-gradient-to-r from-magenta to-cyan px-6 py-3 text-base font-semibold text-black disabled:opacity-50"
                >
                  {sending ? t('email', 'sending') : t('email', 'send')}
                </button>
                <button
                  onClick={generate}
                  disabled={generating}
                  className="rounded-md border border-zinc-700 px-6 py-3 text-base text-zinc-300 hover:border-magenta hover:text-white disabled:opacity-50"
                >
                  {generating ? t('email', 'generating') : t('email', 'regenerate')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
