'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { TRANSLATIONS } from '@/lib/i18n';

type ContactType = 'venue' | 'promoter' | 'press' | 'sync' | 'curator' | 'other';
type ContactStatus = 'new' | 'contacted' | 'responded' | 'negotiating' | 'confirmed' | 'passed' | 'dead';

interface Contact {
  id: number;
  name: string;
  type: ContactType;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  status: ContactStatus;
  notes: string | null;
  updated_at: string;
}

interface ReviewRow {
  key: number;
  name: string;
  type: ContactType;
  company: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  notes: string;
  isDuplicate: boolean;
  included: boolean;
}

const TYPE_KEYS: Record<ContactType, keyof typeof TRANSLATIONS.contacts> = {
  venue: 'typeVenue',
  promoter: 'typePromoter',
  press: 'typePress',
  sync: 'typeSync',
  curator: 'typeCurator',
  other: 'typeOther',
};

const STATUS_KEYS: Record<ContactStatus, keyof typeof TRANSLATIONS.contacts> = {
  new: 'statusNew',
  contacted: 'statusContacted',
  responded: 'statusResponded',
  negotiating: 'statusNegotiating',
  confirmed: 'statusConfirmed',
  passed: 'statusPassed',
  dead: 'statusDead',
};

const STATUS_ORDER: ContactStatus[] = ['new', 'contacted', 'responded', 'negotiating', 'confirmed', 'passed', 'dead'];
const STATUS_STYLE: Record<ContactStatus, string> = {
  new: 'border-zinc-700 text-zinc-400',
  contacted: 'border-gold bg-gold/10 text-gold',
  responded: 'border-cyan bg-cyan/10 text-cyan',
  negotiating: 'border-cyan bg-cyan/10 text-cyan',
  confirmed: 'border-cyan bg-cyan/20 text-cyan',
  passed: 'border-zinc-800 text-zinc-600',
  dead: 'border-zinc-800 text-zinc-600',
};

let rowKeySeq = 0;

export default function ContactsPage() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const fileInput = useRef<HTMLInputElement>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'venue' as ContactType, company: '', email: '', phone: '', city: '', country: '' });
  const [error, setError] = useState('');

  const [outlook, setOutlook] = useState<{ configured: boolean; connected: boolean; email: string | null } | null>(null);
  const [wixConfigured, setWixConfigured] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [wixSyncing, setWixSyncing] = useState(false);
  const [reviewRows, setReviewRows] = useState<ReviewRow[] | null>(null);
  const [importSource, setImportSource] = useState<'file' | 'outlook' | 'wix' | null>(null);
  const [committing, setCommitting] = useState(false);
  const [importNotice, setImportNotice] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/contacts');
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  }

  async function loadOutlookStatus() {
    const res = await fetch('/api/contacts/outlook/status');
    if (res.ok) setOutlook(await res.json());
  }

  async function loadWixStatus() {
    const res = await fetch('/api/contacts/wix/sync');
    if (res.ok) setWixConfigured((await res.json()).configured);
  }

  useEffect(() => {
    load();
    loadOutlookStatus();
    loadWixStatus();
  }, []);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const err = searchParams.get('error');
    const platform = searchParams.get('platform');
    if (connected === 'outlook') setImportNotice(t('contacts', 'outlookConnected'));
    if (err && platform === 'outlook') {
      setError(err === 'not_configured' ? t('contacts', 'outlookNotConfigured') : err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function createContact() {
    setError('');
    if (!form.name.trim()) return;
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setForm({ name: '', type: 'venue', company: '', email: '', phone: '', city: '', country: '' });
    setShowForm(false);
    load();
  }

  async function setStatus(c: Contact, status: ContactStatus) {
    await fetch(`/api/contacts/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  function toReviewRows(raw: any[]): ReviewRow[] {
    return raw.map((c) => ({
      key: rowKeySeq++,
      name: c.name || '',
      type: (c.type as ContactType) || 'other',
      company: c.company || '',
      email: c.email || '',
      phone: c.phone || '',
      city: c.city || '',
      country: c.country || '',
      notes: c.notes || '',
      isDuplicate: Boolean(c.isDuplicate),
      included: !c.isDuplicate,
    }));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError('');
    setImportNotice('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/contacts/import', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setReviewRows(toReviewRows(data.contacts));
      setImportSource('file');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function syncOutlook() {
    setSyncing(true);
    setError('');
    setImportNotice('');
    try {
      const res = await fetch('/api/contacts/outlook/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      if (data.newCount === 0) {
        setImportNotice(t('contacts', 'outlookNoNew'));
        return;
      }
      setReviewRows(toReviewRows(data.contacts));
      setImportSource('outlook');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function disconnectOutlook() {
    await fetch('/api/contacts/outlook/disconnect', { method: 'POST' });
    loadOutlookStatus();
  }

  async function syncWix() {
    setWixSyncing(true);
    setError('');
    setImportNotice('');
    try {
      const res = await fetch('/api/contacts/wix/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      if (data.newCount === 0) {
        setImportNotice(t('contacts', 'wixNoNew'));
        return;
      }
      setReviewRows(toReviewRows(data.contacts));
      setImportSource('wix');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setWixSyncing(false);
    }
  }

  function updateRow(key: number, patch: Partial<ReviewRow>) {
    setReviewRows((rows) => rows && rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function cancelReview() {
    setReviewRows(null);
    setImportSource(null);
  }

  async function commitReview() {
    if (!reviewRows) return;
    const included = reviewRows.filter((r) => r.included && r.name.trim());
    if (included.length === 0) {
      cancelReview();
      return;
    }
    setCommitting(true);
    setError('');
    try {
      const res = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: included.map((r) => ({
            name: r.name.trim(),
            type: r.type,
            company: r.company.trim() || null,
            email: r.email.trim() || null,
            phone: r.phone.trim() || null,
            city: r.city.trim() || null,
            country: r.country.trim() || null,
            notes: r.notes.trim() || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setImportNotice(
        t('contacts', 'importResult')
          .replace('{created}', String(data.created))
          .replace('{skipped}', String(data.skipped))
      );
      cancelReview();
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  }

  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide text-white">{t('contacts', 'title')}</h1>
          <p className="mt-2 text-base text-zinc-400">{t('contacts', 'subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black"
          >
            + {t('contacts', 'addContact')}
          </button>
        </div>
      </div>

      {/* Bulk import: file upload + Outlook sync */}
      <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
        <p className="text-lg font-semibold text-white">{t('contacts', 'importTitle')}</p>
        <p className="mt-1 text-sm text-zinc-400">{t('contacts', 'importHint')}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.txt,.vcf,.json,.pdf,text/csv,text/plain,application/pdf,application/json"
            onChange={handleFile}
            className="hidden"
            id="contacts-file-import"
          />
          <label
            htmlFor="contacts-file-import"
            className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-600 px-5 py-3 text-base text-zinc-300 hover:border-cyan hover:text-white ${
              importing ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {importing ? t('contacts', 'organizing') : `📎 ${t('contacts', 'importFile')}`}
          </label>

          <div className="h-6 w-px bg-zinc-800" />

          {outlook?.connected ? (
            <>
              <span className="text-sm text-zinc-400">
                {t('contacts', 'outlookConnectedAs')} <span className="text-cyan">{outlook.email}</span>
              </span>
              <button
                onClick={syncOutlook}
                disabled={syncing}
                className="rounded-md border border-cyan/40 px-4 py-2 text-sm text-cyan disabled:opacity-50"
              >
                {syncing ? t('contacts', 'syncing') : `🔄 ${t('contacts', 'syncOutlook')}`}
              </button>
              <button onClick={disconnectOutlook} className="text-sm text-zinc-500 underline hover:text-zinc-300">
                {t('common', 'disconnect')}
              </button>
            </>
          ) : outlook?.configured ? (
            <a
              href="/api/contacts/outlook/connect"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-600 px-5 py-3 text-base text-zinc-300 hover:border-cyan hover:text-white"
            >
              📧 {t('contacts', 'connectOutlook')}
            </a>
          ) : (
            <span className="text-sm text-zinc-600">{t('contacts', 'outlookNotConfigured')}</span>
          )}

          <div className="h-6 w-px bg-zinc-800" />

          {wixConfigured ? (
            <button
              onClick={syncWix}
              disabled={wixSyncing}
              className="rounded-md border border-cyan/40 px-4 py-2 text-sm text-cyan disabled:opacity-50"
            >
              {wixSyncing ? t('contacts', 'syncing') : `🌐 ${t('contacts', 'syncWix')}`}
            </button>
          ) : (
            <span className="text-sm text-zinc-600">{t('contacts', 'wixNotConfigured')}</span>
          )}
        </div>
        <p className="mt-2 text-sm text-zinc-500">{t('contacts', 'importFormats')}</p>

        {importNotice && <p className="mt-3 text-base text-cyan">{importNotice}</p>}
      </div>

      {/* Review parsed contacts before committing */}
      {reviewRows && (
        <div className="mt-6 rounded-xl border border-cyan/40 bg-cyan/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-semibold text-white">
              {t('contacts', 'reviewTitle')} ({reviewRows.length})
            </p>
            <p className="text-sm text-zinc-400">
              {importSource === 'outlook'
                ? t('contacts', 'fromOutlook')
                : importSource === 'wix'
                  ? t('contacts', 'fromWix')
                  : t('contacts', 'fromFile')}
            </p>
          </div>
          <p className="mt-1 text-sm text-zinc-400">{t('contacts', 'reviewHint')}</p>

          <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {reviewRows.map((r) => (
              <div
                key={r.key}
                className={`rounded-lg border p-3 ${r.isDuplicate ? 'border-gold/40 bg-gold/5' : 'border-zinc-800 bg-black/30'}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={r.included}
                    onChange={(e) => updateRow(r.key, { included: e.target.checked })}
                    className="mt-3 h-4 w-4"
                  />
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      className="rounded border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-magenta sm:col-span-1"
                      value={r.name}
                      onChange={(e) => updateRow(r.key, { name: e.target.value })}
                      placeholder={t('contacts', 'name')}
                    />
                    <select
                      className="rounded border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-magenta"
                      value={r.type}
                      onChange={(e) => updateRow(r.key, { type: e.target.value as ContactType })}
                    >
                      {(Object.keys(TYPE_KEYS) as ContactType[]).map((ty) => (
                        <option key={ty} value={ty}>
                          {t('contacts', TYPE_KEYS[ty])}
                        </option>
                      ))}
                    </select>
                    <input
                      className="rounded border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-magenta"
                      value={r.company}
                      onChange={(e) => updateRow(r.key, { company: e.target.value })}
                      placeholder={t('contacts', 'company')}
                    />
                    <input
                      className="rounded border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-magenta"
                      value={r.email}
                      onChange={(e) => updateRow(r.key, { email: e.target.value })}
                      placeholder={t('contacts', 'email')}
                    />
                    <input
                      className="rounded border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-magenta"
                      value={r.phone}
                      onChange={(e) => updateRow(r.key, { phone: e.target.value })}
                      placeholder={t('contacts', 'phone')}
                    />
                    <input
                      className="rounded border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-magenta"
                      value={[r.city, r.country].filter(Boolean).join(', ')}
                      onChange={(e) => {
                        const [city, ...rest] = e.target.value.split(',');
                        updateRow(r.key, { city: city.trim(), country: rest.join(',').trim() });
                      }}
                      placeholder={`${t('contacts', 'city')} / ${t('contacts', 'country')}`}
                    />
                  </div>
                </div>
                {r.isDuplicate && (
                  <p className="ml-7 mt-2 text-sm text-gold">{t('contacts', 'possibleDuplicate')}</p>
                )}
              </div>
            ))}
          </div>

          {error && <p className="mt-3 text-base text-magenta">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={commitReview}
              disabled={committing}
              className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black disabled:opacity-50"
            >
              {committing
                ? t('contacts', 'importing')
                : `${t('contacts', 'confirmImport')} (${reviewRows.filter((r) => r.included).length})`}
            </button>
            <button onClick={cancelReview} className="rounded-md border border-zinc-700 px-5 py-2.5 text-base text-zinc-400">
              {t('common', 'cancel')}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-panel p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('contacts', 'name')}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <select
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ContactType }))}
            >
              {(Object.keys(TYPE_KEYS) as ContactType[]).map((ty) => (
                <option key={ty} value={ty}>
                  {t('contacts', TYPE_KEYS[ty])}
                </option>
              ))}
            </select>
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('contacts', 'company')}
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('contacts', 'email')}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
              placeholder={t('contacts', 'phone')}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
                placeholder={t('contacts', 'city')}
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              <input
                className="rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
                placeholder={t('contacts', 'country')}
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>
          </div>
          {error && <p className="mt-3 text-base text-magenta">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={createContact} className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black">
              {t('common', 'save')}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-5 py-2.5 text-base text-zinc-400">
              {t('common', 'cancel')}
            </button>
          </div>
        </div>
      )}

      {error && !showForm && !reviewRows && <p className="mt-4 text-base text-magenta">{error}</p>}

      {loading ? (
        <p className="mt-6 text-lg text-zinc-400">{t('common', 'loading')}</p>
      ) : contacts.length === 0 ? (
        <p className="mt-6 text-base text-zinc-500">{t('contacts', 'noContacts')}</p>
      ) : (
        <div className="mt-6 space-y-4">
          {contacts.map((c) => (
            <div key={c.id} className="rounded-xl border border-zinc-800 bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-white">{c.name}</p>
                  <p className="text-sm text-zinc-500">
                    {t('contacts', TYPE_KEYS[c.type])}
                    {c.company ? ` · ${c.company}` : ''}
                    {c.city ? ` · ${c.city}${c.country ? `, ${c.country}` : ''}` : ''}
                  </p>
                  {(c.email || c.phone) && (
                    <p className="mt-1 text-sm text-cyan">{[c.email, c.phone].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                <span className="text-sm text-zinc-600">{new Date(c.updated_at).toLocaleDateString(locale)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(c, s)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                      c.status === s ? STATUS_STYLE[s] : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'
                    }`}
                  >
                    {t('contacts', STATUS_KEYS[s])}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
