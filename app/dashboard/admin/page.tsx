'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/components/LanguageProvider';

interface TeamUser {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'manager' | 'artist';
  location: string;
  mustChangePassword: boolean;
  active?: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', displayName: '', location: '', role: 'manager' as TeamUser['role'] });
  const [error, setError] = useState('');
  const [newTemp, setNewTemp] = useState<{ username: string; password: string } | null>(null);
  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  const isAdmin = session?.user?.role === 'admin';

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers((await res.json()).users || []);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function createUser() {
    setError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setNewTemp({ username: data.username, password: data.tempPassword });
    setForm({ username: '', displayName: '', location: '', role: 'manager' });
    setShowForm(false);
    load();
  }

  async function action(userId: number, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.tempPassword) {
      const u = users.find((x) => x.id === userId);
      setNewTemp({ username: u?.username || '', password: data.tempPassword });
    }
    load();
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl tracking-wide text-white">{t('admin', 'title')}</h1>
        <p className="mt-4 text-base text-zinc-400">{t('admin', 'adminOnly')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide text-white">{t('admin', 'title')}</h1>
          <p className="mt-2 text-base text-zinc-400">{t('admin', 'subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black"
        >
          + {t('admin', 'addUser')}
        </button>
      </div>

      {newTemp && (
        <div className="mt-4 rounded-md border border-cyan/40 bg-cyan/10 px-4 py-3 text-base text-cyan">
          {t('admin', 'tempPasswordShown')} <strong>{newTemp.username}</strong> → <code>{newTemp.password}</code>
        </div>
      )}

      {showForm && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('admin', 'username')}
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
            />
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('admin', 'displayName')}
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('admin', 'location')}
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            <select
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as TeamUser['role'] }))}
            >
              <option value="admin">{t('roles', 'admin')}</option>
              <option value="manager">{t('roles', 'manager')}</option>
              <option value="artist">{t('roles', 'artist')}</option>
            </select>
          </div>
          {error && <p className="mt-3 text-base text-magenta">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={createUser} className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black">
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
      ) : (
        <div className="mt-6 space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-zinc-800 bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">
                    {u.displayName} <span className="text-sm font-normal text-zinc-500">@{u.username}</span>
                    {u.active === false && (
                      <span className="ml-2 rounded-full bg-magenta/20 px-2 py-0.5 text-xs text-magenta">
                        {t('admin', 'disabled')}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {t('roles', u.role)} · {u.location} · {new Date(u.createdAt).toLocaleDateString(locale)}
                  </p>
                  {u.mustChangePassword && <p className="mt-1 text-sm text-gold">{lang === 'es' ? 'Contraseña temporal sin usar' : 'Temp password unused'}</p>}
                </div>
                {Number(session?.user?.id) !== u.id && (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={u.role}
                      onChange={(e) => action(u.id, { action: 'setRole', role: e.target.value })}
                      className="rounded-md border border-zinc-700 bg-black/40 px-3 py-1.5 text-sm"
                    >
                      <option value="admin">{t('roles', 'admin')}</option>
                      <option value="manager">{t('roles', 'manager')}</option>
                      <option value="artist">{t('roles', 'artist')}</option>
                    </select>
                    <button
                      onClick={() => action(u.id, { action: 'resetPassword' })}
                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-magenta hover:text-white"
                    >
                      {t('admin', 'resetPassword')}
                    </button>
                    <button
                      onClick={() => action(u.id, { action: 'setActive', active: !(u.active ?? true) })}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        u.active === false
                          ? 'border-cyan/40 text-cyan hover:border-cyan'
                          : 'border-zinc-700 text-zinc-300 hover:border-magenta hover:text-white'
                      }`}
                    >
                      {u.active === false ? t('admin', 'enable') : t('admin', 'disable')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
