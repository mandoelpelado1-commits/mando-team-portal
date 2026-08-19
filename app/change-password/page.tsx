'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useLanguage, LanguageToggle } from '@/components/LanguageProvider';

export default function ForcedChangePasswordPage() {
  const { data: session, update } = useSession();
  const { t } = useLanguage();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('settings', 'noMatch'));
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    // Refresh the JWT so mustChangePassword flips to false, then let them in.
    await update();
    router.replace('/dashboard');
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
        <div className="mb-8 flex flex-col items-center gap-4">
          <Image
            src="/mando-el-pelado-logo.png"
            alt="Mando El Pelado"
            width={160}
            height={104}
            className="w-32 rounded-lg bg-white p-3"
          />
          <LanguageToggle className="w-28" />
        </div>

        <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-base text-gold">
          {t('forceChange', 'notice')}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-zinc-800 bg-panel p-6 sm:p-8">
          <p className="mb-1 text-xl font-semibold text-white">{t('forceChange', 'title')}</p>
          <p className="mb-5 text-base text-zinc-400">
            {session?.user?.name} ({session?.user?.username})
          </p>

          <label className="mb-2 block text-sm uppercase tracking-wide text-zinc-400">
            {t('forceChange', 'tempPassword')}
          </label>
          <input
            type="password"
            className="mb-4 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <label className="mb-2 block text-sm uppercase tracking-wide text-zinc-400">
            {t('settings', 'newPassword')}
          </label>
          <input
            type="password"
            className="mb-4 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <label className="mb-2 block text-sm uppercase tracking-wide text-zinc-400">
            {t('settings', 'confirmPassword')}
          </label>
          <input
            type="password"
            className="mb-2 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="mb-5 text-sm text-zinc-500">{t('forceChange', 'hint')}</p>

          {error && <p className="mb-4 text-base text-magenta">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-3 text-base font-semibold text-black disabled:opacity-50"
          >
            {loading ? t('settings', 'saving') : t('forceChange', 'submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
