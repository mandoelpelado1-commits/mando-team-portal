'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

interface PlatformStatus {
  platform: string;
  label: string;
  configured: boolean;
  clientId: string | null;
  connected: boolean;
  platformUsername: string | null;
  connectedAt: string | null;
  redirectUri: string;
}

interface TeamConnection {
  userName: string;
  platform: string;
  platformUsername: string | null;
  connectedAt: string | null;
}

const DEVELOPER_CONSOLE_URL: Record<string, string> = {
  instagram: 'https://developers.facebook.com/apps',
  facebook: 'https://developers.facebook.com/apps',
  tiktok: 'https://developers.tiktok.com/apps',
  youtube: 'https://console.cloud.google.com/apis/credentials',
  x: 'https://developer.x.com/en/portal/dashboard',
};

// TikTok's own dashboard shows THREE distinct values — App ID, Client key,
// and Client secret — and only "Client key" is the OAuth client_id we need.
// Our field was generically labeled "Client ID / App ID" for every platform,
// which reads as "these are interchangeable" and steers people toward
// pasting the App ID by mistake — that's exactly what produces TikTok's
// "couldn't log in... client_key" error at the authorize step.
const CLIENT_ID_FIELD_OVERRIDE: Partial<Record<string, { es: string; en: string }>> = {
  tiktok: { es: 'Client Key (no el App ID)', en: 'Client Key (not the App ID)' },
};

export default function SocialsPage() {
  return (
    <Suspense fallback={<p className="text-lg text-zinc-400">...</p>}>
      <SocialsPageInner />
    </Suspense>
  );
}

function SocialsPageInner() {
  const { t, lang } = useLanguage();
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [team, setTeam] = useState<TeamConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saveError, setSaveError] = useState('');
  const searchParams = useSearchParams();

  async function load() {
    setLoading(true);
    const res = await fetch('/api/social/status');
    const data = await res.json();
    setPlatforms(data.platforms || []);
    setTeam(data.team || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function disconnect(platform: string) {
    await fetch(`/api/social/disconnect/${platform}`, { method: 'POST' });
    load();
  }

  async function removeCredentials(platform: string) {
    await fetch(`/api/social/credentials/${platform}`, { method: 'DELETE' });
    load();
  }

  async function saveCredentials(platform: string) {
    setSaveError('');
    const res = await fetch(`/api/social/credentials/${platform}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSaveError(data.error);
      return;
    }
    setEditing(null);
    setClientId('');
    setClientSecret('');
    load();
  }

  const connectedMsg = searchParams.get('connected');
  const errorMsg = searchParams.get('error');
  const errorPlatform = searchParams.get('platform');

  return (
    <div>
      <h1 className="font-display text-4xl tracking-wide text-white">{t('socials', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('socials', 'subtitle')}</p>

      {connectedMsg && (
        <div className="mt-4 rounded-md border border-cyan/40 bg-cyan/10 px-4 py-3 text-base text-cyan">
          {t('socials', 'connectedOk').replace('{p}', connectedMsg)}
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 rounded-md border border-magenta/40 bg-magenta/10 px-4 py-3 text-base text-magenta">
          {errorPlatform ? `${errorPlatform}: ` : ''}
          {errorMsg === 'not_configured' ? t('socials', 'addFirst') : errorMsg}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-lg text-zinc-400">{t('common', 'loading')}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {platforms.map((p) => (
            <div key={p.platform} className="rounded-xl border border-zinc-800 bg-panel p-6">
              <div className="flex items-center justify-between">
                <p className="text-xl font-semibold text-white">{p.label}</p>
                {p.connected ? (
                  <span className="rounded-full bg-cyan/20 px-3 py-1 text-sm text-cyan">
                    {t('common', 'connected')}
                  </span>
                ) : p.configured ? (
                  <span className="rounded-full bg-zinc-700 px-3 py-1 text-sm text-zinc-300">
                    {t('common', 'notConnected')}
                  </span>
                ) : (
                  <span className="rounded-full bg-gold/20 px-3 py-1 text-sm text-gold">
                    {t('socials', 'noCredentials')}
                  </span>
                )}
              </div>

              {p.connected && p.platformUsername && (
                <p className="mt-3 text-base text-zinc-400">@{p.platformUsername}</p>
              )}

              {editing === p.platform ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm uppercase tracking-wide text-zinc-500">
                      {CLIENT_ID_FIELD_OVERRIDE[p.platform]?.[lang] || t('socials', 'clientId')}
                    </label>
                    <input
                      className="w-full rounded-md border border-zinc-700 bg-black/40 px-3 py-2 text-base outline-none focus:border-magenta"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                    />
                    {p.platform === 'tiktok' && (
                      <p className="mt-1 text-sm text-gold">{t('socials', 'tiktokClientKeyHint')}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm uppercase tracking-wide text-zinc-500">
                      {t('socials', 'clientSecret')}
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-md border border-zinc-700 bg-black/40 px-3 py-2 text-base outline-none focus:border-magenta"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                    />
                  </div>
                  <div className="rounded-md border border-zinc-800 bg-black/30 p-3">
                    <p className="text-sm uppercase tracking-wide text-zinc-500">
                      {t('socials', 'registerRedirect')}
                    </p>
                    <p className="break-anywhere mt-1 font-mono text-sm text-cyan">{p.redirectUri}</p>
                  </div>
                  {saveError && <p className="text-sm text-magenta">{saveError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveCredentials(p.platform)}
                      disabled={!clientId || !clientSecret}
                      className="rounded-md bg-gradient-to-r from-magenta to-cyan px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                    >
                      {t('common', 'save')}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(null);
                        setSaveError('');
                      }}
                      className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
                    >
                      {t('common', 'cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!p.configured ? (
                    <p className="break-anywhere mt-4 text-sm text-zinc-500">
                      {t('socials', 'registerAt')}{' '}
                      <a
                        href={DEVELOPER_CONSOLE_URL[p.platform]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan underline"
                      >
                        {DEVELOPER_CONSOLE_URL[p.platform].replace('https://', '')}
                      </a>
                      {t('socials', 'thenAdd')}
                    </p>
                  ) : (
                    <p className="break-anywhere mt-4 text-sm text-zinc-500">
                      {p.platform === 'tiktok' ? t('socials', 'tiktokClientKeyLabel') : t('socials', 'appId')} {p.clientId}
                    </p>
                  )}

                  {p.platform === 'tiktok' && p.configured && !p.connected && (
                    <p className="mt-2 text-sm text-zinc-500">{t('socials', 'tiktokTroubleshoot')}</p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {p.configured && !p.connected && (
                      <a
                        href={`/api/social/connect/${p.platform}`}
                        className="inline-block rounded-md bg-gradient-to-r from-magenta to-cyan px-4 py-2 text-sm font-semibold text-black"
                      >
                        {t('socials', 'connect')} {p.label}
                      </a>
                    )}
                    {p.connected && (
                      <button
                        onClick={() => disconnect(p.platform)}
                        className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-magenta hover:text-white"
                      >
                        {t('socials', 'disconnect')}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditing(p.platform);
                        setClientId('');
                        setClientSecret('');
                        setSaveError('');
                      }}
                      className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500"
                    >
                      {p.configured ? t('socials', 'editCredentials') : t('socials', 'addCredentials')}
                    </button>
                    {p.configured && (
                      <button
                        onClick={() => removeCredentials(p.platform)}
                        className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-500 hover:border-magenta hover:text-magenta"
                      >
                        {t('common', 'remove')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && team.length > 0 && (
        <div className="mt-10 rounded-xl border border-zinc-800 bg-panel p-6">
          <p className="text-sm uppercase tracking-wide text-zinc-400">{t('socials', 'teamConnections')}</p>
          <p className="mt-1 text-sm text-zinc-500">{t('socials', 'teamConnectionsHint')}</p>
          <div className="mt-4 space-y-2">
            {team.map((c, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-black/20 px-4 py-3"
              >
                <span className="text-base text-zinc-200">
                  {c.userName} <span className="text-zinc-500">·</span> {c.platform}
                  {c.platformUsername ? ` · @${c.platformUsername}` : ''}
                </span>
                <span className="text-sm text-cyan">{t('common', 'connected')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
