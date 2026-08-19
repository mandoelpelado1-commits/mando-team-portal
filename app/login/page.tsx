'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import EqualizerBars from '@/components/EqualizerBars';
import { useLanguage, LanguageToggle } from '@/components/LanguageProvider';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', {
      username: username.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError(t('login', 'invalid'));
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center gap-4">
          <Image src="/mando-el-pelado-logo.png" alt="Mando El Pelado" width={180} height={116} className="rounded-lg bg-white p-3" />
          <EqualizerBars />
          <p className="text-base uppercase tracking-[0.3em] text-zinc-400">{t('login', 'portal')}</p>
          <LanguageToggle className="w-28" />
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-800 bg-panel p-8 shadow-xl shadow-black/40"
        >
          <div className="mb-5">
            <label className="mb-2 block text-sm uppercase tracking-wide text-zinc-400">{t('login', 'username')}</label>
            <input
              className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="mb-6">
            <label className="mb-2 block text-sm uppercase tracking-wide text-zinc-400">{t('login', 'password')}</label>
            <input
              type="password"
              className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="mb-4 text-base text-magenta">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-gradient-to-r from-magenta to-cyan px-4 py-3 text-base font-semibold text-black transition disabled:opacity-50"
          >
            {loading ? t('login', 'signingIn') : t('login', 'signIn')}
          </button>
        </form>
      </div>
    </div>
  );
}
