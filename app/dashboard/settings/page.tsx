'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage, LanguageToggle } from '@/components/LanguageProvider';

const EXPORT_DATASETS = ['milestones', 'contacts', 'shows', 'playlists', 'budget_history', 'ideas'] as const;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { t } = useLanguage();
  const avatarInput = useRef<HTMLInputElement>(null);

  // Profile (avatar + display name)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Email
  const [email, setEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Phone (SMS notifications)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    fetch('/api/settings/email')
      .then((r) => r.json())
      .then((d) => setEmail(d.email || ''))
      .catch(() => {});
    fetch('/api/settings/phone')
      .then((r) => r.json())
      .then((d) => setPhoneNumber(d.phoneNumber || ''))
      .catch(() => {});
    fetch('/api/settings/profile')
      .then((r) => r.json())
      .then((d) => {
        setAvatarUrl(d.avatarUrl || null);
        setDisplayName(d.displayName || '');
      })
      .catch(() => {});
  }, []);

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setProfileError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/settings/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error);
        return;
      }
      setAvatarUrl(data.avatarUrl);
      await update();
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setAvatarUploading(false);
      if (avatarInput.current) avatarInput.current.value = '';
    }
  }

  async function removeAvatar() {
    setAvatarUploading(true);
    setProfileError('');
    try {
      await fetch('/api/settings/avatar', { method: 'DELETE' });
      setAvatarUrl(null);
      await update();
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveDisplayName() {
    setProfileSaving(true);
    setProfileError('');
    setProfileSaved(false);
    const res = await fetch('/api/settings/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    });
    const data = await res.json();
    setProfileSaving(false);
    if (!res.ok) {
      setProfileError(data.error);
      return;
    }
    setProfileSaved(true);
    await update();
  }

  // Push notifications
  const [pushStatus, setPushStatus] = useState<{ configured: boolean; publicKey: string | null; subscribed: boolean } | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [pushNotice, setPushNotice] = useState('');

  async function loadPushStatus() {
    const res = await fetch('/api/push/status');
    if (res.ok) setPushStatus(await res.json());
  }

  useEffect(() => {
    loadPushStatus();
  }, []);

  async function enablePush() {
    setPushBusy(true);
    setPushError('');
    setPushNotice('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushError(t('security', 'pushUnsupported'));
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushError(t('security', 'pushDenied'));
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushStatus!.publicKey!) as BufferSource,
      });
      const json = subscription.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) {
        setPushError((await res.json()).error);
        return;
      }
      await loadPushStatus();
    } catch (err: any) {
      setPushError(err.message);
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    setPushError('');
    setPushNotice('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      await loadPushStatus();
    } finally {
      setPushBusy(false);
    }
  }

  async function testPush() {
    setPushBusy(true);
    setPushError('');
    setPushNotice('');
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      if (!res.ok) {
        setPushError((await res.json()).error);
        return;
      }
      setPushNotice(t('security', 'pushTestSent'));
    } finally {
      setPushBusy(false);
    }
  }

  // 2FA
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpInput, setTotpInput] = useState('');
  const [twoFaError, setTwoFaError] = useState('');
  const [twoFaSuccess, setTwoFaSuccess] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPassword !== confirmPassword) {
      setPwError(t('settings', 'noMatch'));
      return;
    }
    setPwLoading(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setPwLoading(false);
    if (!res.ok) {
      setPwError(data.error);
      return;
    }
    setPwSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    await update();
  }

  async function saveEmail() {
    setEmailError('');
    setEmailSaved(false);
    const res = await fetch('/api/settings/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEmailError(data.error);
      return;
    }
    setEmailSaved(true);
  }

  async function savePhone() {
    setPhoneError('');
    setPhoneSaved(false);
    const res = await fetch('/api/settings/phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPhoneError(data.error);
      return;
    }
    setPhoneSaved(true);
  }

  async function start2fa() {
    setTwoFaError('');
    const res = await fetch('/api/2fa/setup', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setTwoFaError(data.error);
      return;
    }
    setQrDataUrl(data.qrDataUrl);
  }

  async function confirm2fa() {
    setTwoFaLoading(true);
    setTwoFaError('');
    const res = await fetch('/api/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totpInput }),
    });
    const data = await res.json();
    setTwoFaLoading(false);
    if (!res.ok) {
      setTwoFaError(data.error);
      return;
    }
    setQrDataUrl(null);
    setTotpInput('');
    setTwoFaSuccess(t('security', 'enabled'));
    await update();
  }

  async function disable2fa() {
    setTwoFaLoading(true);
    await fetch('/api/2fa/disable', { method: 'POST' });
    setTwoFaLoading(false);
    setTwoFaSuccess(t('security', 'disabled2fa'));
    await update();
  }

  return (
    <div>
      <h1 className="font-display text-4xl tracking-wide text-white">{t('settings', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">
        {t('settings', 'signedInAs')} {session?.user?.name} ({session?.user?.username})
      </p>

      {/* Profile: avatar + display name */}
      <div className="mt-6 max-w-md rounded-xl border border-zinc-800 bg-panel p-6">
        <p className="text-lg font-semibold text-white">{t('settings', 'profile')}</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-cyan/40" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-magenta to-cyan text-2xl font-bold text-black">
                {(displayName || session?.user?.name || '?').trim().charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <input
              ref={avatarInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarFile}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-cyan hover:text-white ${
                avatarUploading ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {avatarUploading ? t('settings', 'uploading') : t('settings', 'changePhoto')}
            </label>
            {avatarUrl && (
              <button
                onClick={removeAvatar}
                disabled={avatarUploading}
                className="ml-2 text-sm text-zinc-500 underline hover:text-zinc-300 disabled:opacity-50"
              >
                {t('common', 'remove')}
              </button>
            )}
            <p className="mt-1.5 text-sm text-zinc-500">{t('settings', 'photoHint')}</p>
          </div>
        </div>

        <label className="mb-2 mt-5 block text-sm uppercase tracking-wide text-zinc-400">
          {t('settings', 'displayName')}
        </label>
        <input
          className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
        />
        {profileError && <p className="mt-2 text-base text-magenta">{profileError}</p>}
        {profileSaved && <p className="mt-2 text-base text-cyan">{t('settings', 'updated')}</p>}
        <button
          onClick={saveDisplayName}
          disabled={profileSaving || !displayName.trim()}
          className="mt-4 rounded-md border border-zinc-700 px-5 py-2.5 text-base text-zinc-300 hover:border-magenta hover:text-white disabled:opacity-50"
        >
          {profileSaving ? t('settings', 'saving') : t('common', 'save')}
        </button>
      </div>

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

      {/* Email for notifications */}
      <div className="mt-6 max-w-md rounded-xl border border-zinc-800 bg-panel p-6">
        <p className="text-lg font-semibold text-white">{t('security', 'yourEmail')}</p>
        <p className="mt-1 text-sm text-zinc-400">{t('security', 'emailHint')}</p>
        <input
          type="email"
          className="mt-4 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {emailError && <p className="mt-2 text-base text-magenta">{emailError}</p>}
        {emailSaved && <p className="mt-2 text-base text-cyan">{t('settings', 'updated')}</p>}
        <button
          onClick={saveEmail}
          className="mt-4 rounded-md border border-zinc-700 px-5 py-2.5 text-base text-zinc-300 hover:border-magenta hover:text-white"
        >
          {t('security', 'saveEmail')}
        </button>
      </div>

      {/* Phone number for text notifications */}
      <div className="mt-6 max-w-md rounded-xl border border-zinc-800 bg-panel p-6">
        <p className="text-lg font-semibold text-white">{t('security', 'yourPhone')}</p>
        <p className="mt-1 text-sm text-zinc-400">{t('security', 'phoneHint')}</p>
        <input
          type="tel"
          className="mt-4 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
          placeholder="+18095551234"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        {phoneError && <p className="mt-2 text-base text-magenta">{phoneError}</p>}
        {phoneSaved && <p className="mt-2 text-base text-cyan">{t('settings', 'updated')}</p>}
        <button
          onClick={savePhone}
          className="mt-4 rounded-md border border-zinc-700 px-5 py-2.5 text-base text-zinc-300 hover:border-magenta hover:text-white"
        >
          {t('security', 'savePhone')}
        </button>
      </div>

      {/* Push notifications */}
      <div className="mt-6 max-w-md rounded-xl border border-zinc-800 bg-panel p-6">
        <p className="text-lg font-semibold text-white">{t('security', 'pushTitle')}</p>
        <p className="mt-1 text-sm text-zinc-400">{t('security', 'pushHint')}</p>

        {pushError && <p className="mt-3 text-base text-magenta">{pushError}</p>}
        {pushNotice && <p className="mt-3 text-base text-cyan">{pushNotice}</p>}

        {!pushStatus?.configured ? (
          <p className="mt-4 text-sm text-zinc-600">{t('security', 'pushNotConfigured')}</p>
        ) : pushStatus.subscribed ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-md border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm text-cyan">
              {t('security', 'pushEnabled')}
            </span>
            <button
              onClick={testPush}
              disabled={pushBusy}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-cyan hover:text-white disabled:opacity-50"
            >
              {t('security', 'pushSendTest')}
            </button>
            <button
              onClick={disablePush}
              disabled={pushBusy}
              className="text-sm text-zinc-500 underline hover:text-zinc-300 disabled:opacity-50"
            >
              {t('security', 'pushDisable')}
            </button>
          </div>
        ) : (
          <button
            onClick={enablePush}
            disabled={pushBusy}
            className="mt-4 rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black disabled:opacity-50"
          >
            {pushBusy ? t('security', 'pushEnabling') : `🔔 ${t('security', 'pushEnable')}`}
          </button>
        )}
      </div>

      {/* 2FA */}
      <div className="mt-6 max-w-md rounded-xl border border-zinc-800 bg-panel p-6">
        <p className="text-lg font-semibold text-white">{t('security', 'twoFactor')}</p>
        <p className="mt-1 text-sm text-zinc-400">{t('security', 'twoFactorHint')}</p>

        {twoFaError && <p className="mt-3 text-base text-magenta">{twoFaError}</p>}
        {twoFaSuccess && <p className="mt-3 text-base text-cyan">{twoFaSuccess}</p>}

        {session?.user?.totpEnabled ? (
          <button
            onClick={disable2fa}
            disabled={twoFaLoading}
            className="mt-4 rounded-md border border-magenta/40 px-5 py-2.5 text-base text-magenta disabled:opacity-50"
          >
            {t('security', 'disable2fa')}
          </button>
        ) : qrDataUrl ? (
          <div className="mt-4">
            <p className="mb-2 text-sm text-zinc-400">{t('security', 'scanQr')}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="2FA QR code" className="rounded-md border border-zinc-700 bg-white p-2" width={200} height={200} />
            <label className="mb-2 mt-4 block text-sm uppercase tracking-wide text-zinc-400">
              {t('security', 'enterCode')}
            </label>
            <input
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-magenta"
              value={totpInput}
              onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ''))}
            />
            <button
              onClick={confirm2fa}
              disabled={twoFaLoading || totpInput.length !== 6}
              className="mt-3 rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black disabled:opacity-50"
            >
              {t('security', 'confirm')}
            </button>
          </div>
        ) : (
          <button
            onClick={start2fa}
            className="mt-4 rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black"
          >
            {t('security', 'enable2fa')}
          </button>
        )}
      </div>

      {/* Password change */}
      <form onSubmit={handlePasswordSubmit} className="mt-6 max-w-md rounded-xl border border-zinc-800 bg-panel p-6">
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

        {pwError && <p className="mb-4 text-base text-magenta">{pwError}</p>}
        {pwSuccess && <p className="mb-4 text-base text-cyan">{t('settings', 'updated')}</p>}

        <button
          type="submit"
          disabled={pwLoading}
          className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-3 text-base font-semibold text-black disabled:opacity-50"
        >
          {pwLoading ? t('settings', 'saving') : t('settings', 'update')}
        </button>
      </form>

      {/* Data export */}
      <div className="mt-6 max-w-md rounded-xl border border-zinc-800 bg-panel p-6">
        <p className="text-lg font-semibold text-white">{t('exportData', 'title')}</p>
        <p className="mt-1 text-sm text-zinc-400">{t('exportData', 'hint')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXPORT_DATASETS.map((d) => (
            <a
              key={d}
              href={`/api/export?dataset=${d}`}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-cyan hover:text-cyan"
            >
              {d.replace('_', ' ')}.csv
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
