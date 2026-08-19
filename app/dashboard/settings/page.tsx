'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage, LanguageToggle } from '@/components/LanguageProvider';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

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

    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    await update();
  }

  return (
    <div>
      <h1 className="font-display text-4xl tracking-wide text-white">{t('settings', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">
        {t('settings', 'signedInAs')} {session?.user?.name} ({session?.user?.username})
      </p>

      <div className="mt-6 max-w-md rounded-xl border border-zinc-800 bg-panel p-6">
        <p className="text-lg font-semibold text-white">{t('settings', 'language')}</p>
        <p className="mt-1 text-sm text-zinc-400">{t('settings', 'languageHint')}</p>
        <LanguageToggle className="mt-4 w-40" />
      </div>

      {session?.user?.mustChangePassword && (
        <div className="mt-6 max-w-md rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-base text-gold">
          {t('settings', 'tempPassword')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 max-w-md rounded-xl border border-zinc-800 bg-panel p-6">
        <p className="mb-5 text-lg font-semibold text-white">{t('settings', 'changePassword')}</p>

        <label className="mb-2 block text-sm uppercase tracking-wide text-zinc-400">
          {t('settings', 'currentPassword')}
        </label>
        <input
          type="password"
          className="mb-4 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
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
          minLength={8}
          required
        />

        <label className="mb-2 block text-sm uppercase tracking-wide text-zinc-400">
          {t('settings', 'confirmPassword')}
        </label>
        <input
          type="password"
          className="mb-5 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={8}
          required
        />

        {error && <p className="mb-4 text-base text-magenta">{error}</p>}
        {success && <p className="mb-4 text-base text-cyan">{t('settings', 'updated')}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-3 text-base font-semibold text-black disabled:opacity-50"
        >
          {loading ? t('settings', 'saving') : t('settings', 'update')}
        </button>
      </form>
    </div>
  );
}
