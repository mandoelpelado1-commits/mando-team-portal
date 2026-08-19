'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Lang } from '@/lib/i18n';

interface EmailDraft {
  subject: string;
  preheader: string;
  greeting: string;
  paragraphs: string[];
  signOff: string;
}

export default function EmailPage() {
  const { t, lang } = useLanguage();
  const [emailLang, setEmailLang] = useState<Lang>(lang);
  const [topic, setTopic] = useState('');
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<{ dashboardUrl: string } | null>(null);

  async function generate() {
    setGenerating(true);
    setError('');
    setDraft(null);
    setSent(null);
    try {
      const res = await fetch('/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language: emailLang }),
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
        body: JSON.stringify({ draft }),
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
              disabled={generating || !topic.trim()}
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
                  <p className="text-base">{draft.greeting}</p>
                  {draft.paragraphs.map((p, i) => (
                    <p key={i} className="mt-3 text-base leading-relaxed">
                      {p}
                    </p>
                  ))}
                  <p className="mt-4 text-base">{draft.signOff}</p>
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
