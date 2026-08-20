'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface EndpointUsage {
  endpoint: string;
  label_en: string;
  label_es: string;
  used: number;
  limit: number;
}

interface UsageData {
  myUsageToday: EndpointUsage[];
  billingConfigured: boolean;
  billing: { totalUsd: number; periodDays: number; todayUsd: number } | null;
  usage: { totalInputTokens: number; totalOutputTokens: number; periodDays: number } | null;
  billingError: string | null;
}

interface Conversation {
  id: number;
  title: string;
  updated_at: string;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources: { title: string; url: string }[];
  createdAt: string;
}

export default function DitoPage() {
  const { t, lang } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [memory, setMemory] = useState<{ content: string; updatedAt: string } | null>(null);
  const [refreshingMemory, setRefreshingMemory] = useState(false);
  const [memoryError, setMemoryError] = useState('');

  const [usage, setUsage] = useState<UsageData | null>(null);
  const [showUsage, setShowUsage] = useState(false);

  async function loadUsage() {
    const res = await fetch('/api/dito/usage');
    if (res.ok) setUsage(await res.json());
  }

  async function loadMemory() {
    const res = await fetch('/api/dito/memory/refresh');
    if (res.ok) setMemory((await res.json()).memory);
  }

  async function refreshMemory() {
    setRefreshingMemory(true);
    setMemoryError('');
    try {
      const res = await fetch('/api/dito/memory/refresh', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMemoryError(data.error);
        return;
      }
      setMemory(data.memory);
    } catch (err: any) {
      setMemoryError(err.message);
    } finally {
      setRefreshingMemory(false);
    }
  }

  async function loadConversations() {
    const res = await fetch('/api/dito/conversations');
    const data = await res.json();
    setConversations(data.conversations || []);
    if (!activeId && data.conversations?.length) setActiveId(data.conversations[0].id);
  }

  async function loadMessages(id: number) {
    const res = await fetch(`/api/dito/conversations/${id}`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  useEffect(() => {
    loadConversations();
    loadMemory();
    loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function newConversation() {
    const res = await fetch('/api/dito/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t('dito', 'newChat') }),
    });
    const data = await res.json();
    await loadConversations();
    setActiveId(data.id);
    setMessages([]);
  }

  async function send() {
    if (!input.trim()) return;
    let convId = activeId;
    setError('');
    setNotConfigured(false);

    if (!convId) {
      const res = await fetch('/api/dito/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.trim().slice(0, 60) }),
      });
      const data = await res.json();
      convId = data.id;
      setActiveId(convId);
      await loadConversations();
    }

    const userMsg: Message = { id: Date.now(), role: 'user', content: input.trim(), sources: [], createdAt: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    const toSend = input.trim();
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`/api/dito/conversations/${convId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: toSend, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 501) setNotConfigured(true);
        setError(data.error);
        return;
      }
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, role: 'assistant', content: data.reply, sources: data.sources || [], createdAt: new Date().toISOString() },
      ]);
      loadConversations();
      loadUsage();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] max-h-[900px] flex-col lg:flex-row lg:gap-6">
      {/* Conversation list */}
      <div className="mb-4 w-full shrink-0 lg:mb-0 lg:w-64">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dito-avatar.jpg" alt="DITO" className="h-11 w-11 rounded-full object-cover ring-2 ring-cyan/40" />
            <h1 className="font-display text-2xl tracking-wide text-white">DITO</h1>
          </div>
          <button
            onClick={newConversation}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-magenta hover:text-white"
          >
            + {t('dito', 'newChat')}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`shrink-0 rounded-md border px-3 py-2 text-left text-sm lg:w-full ${
                activeId === c.id ? 'border-magenta/40 bg-magenta/10 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <span className="line-clamp-1">{c.title}</span>
            </button>
          ))}
        </div>

        {/* Usage */}
        <div className="mt-4 rounded-lg border border-zinc-800 bg-panel p-3">
          <button
            onClick={() => setShowUsage((v) => !v)}
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-zinc-300"
          >
            <span>📊 {t('dito', 'usageTitle')}</span>
            <span className="text-zinc-500">{showUsage ? '▲' : '▼'}</span>
          </button>

          {showUsage && usage && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-zinc-500">{t('dito', 'usageToday')}</p>
                <div className="space-y-1.5">
                  {usage.myUsageToday.map((e) => (
                    <div key={e.endpoint} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-zinc-400">{lang === 'es' ? e.label_es : e.label_en}</span>
                      <span
                        className={`shrink-0 font-mono ${e.used >= e.limit ? 'text-magenta' : 'text-zinc-300'}`}
                      >
                        {e.used}/{e.limit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-3">
                <p className="mb-1.5 text-xs uppercase tracking-wide text-zinc-500">{t('dito', 'usageBilling')}</p>
                {!usage.billingConfigured ? (
                  <p className="text-sm text-zinc-600">{t('dito', 'usageBillingNotConfigured')}</p>
                ) : usage.billingError ? (
                  <p className="text-sm text-magenta">{usage.billingError}</p>
                ) : usage.billing ? (
                  <>
                    <div className="flex items-baseline gap-4">
                      <div>
                        <p className="text-2xl font-semibold text-white">${usage.billing.todayUsd.toFixed(2)}</p>
                        <p className="text-sm text-zinc-500">{t('dito', 'usageToday30')}</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-zinc-300">${usage.billing.totalUsd.toFixed(2)}</p>
                        <p className="text-sm text-zinc-500">
                          {t('dito', 'usageLast')} {usage.billing.periodDays} {t('dito', 'usageDays')}
                        </p>
                      </div>
                    </div>
                    {usage.usage && (
                      <p className="mt-2 text-sm text-zinc-500">
                        {(usage.usage.totalInputTokens + usage.usage.totalOutputTokens).toLocaleString(lang === 'es' ? 'es-EC' : 'en-US')}{' '}
                        {t('dito', 'usageTokens')} ({usage.usage.periodDays}d)
                      </p>
                    )}
                    <p className="mt-2 text-sm text-zinc-600">{t('dito', 'usageNoBalance')}</p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-600">{t('common', 'loading')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-800 bg-panel">
        <div className="border-b border-zinc-800 px-5 py-3">
          <p className="text-sm text-zinc-400">{t('dito', 'subtitle')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500">
              {memory
                ? `${t('dito', 'mandoMemoryKnown')} ${new Date(memory.updatedAt).toLocaleDateString(lang === 'es' ? 'es-EC' : 'en-US')}`
                : t('dito', 'mandoMemoryNone')}
            </span>
            <button
              onClick={refreshMemory}
              disabled={refreshingMemory}
              className="rounded-md border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:border-cyan hover:text-white disabled:opacity-50"
            >
              {refreshingMemory ? t('dito', 'mandoMemoryRefreshing') : `🔄 ${t('dito', 'mandoMemoryRefresh')}`}
            </button>
          </div>
          {memoryError && <p className="mt-1 text-sm text-magenta">{memoryError}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 && !sending && (
            <p className="text-base text-zinc-500">{t('dito', 'emptyState')}</p>
          )}
          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/dito-avatar.jpg" alt="DITO" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-base ${
                    m.role === 'user' ? 'bg-gradient-to-r from-magenta to-cyan text-black' : 'border border-zinc-800 bg-black/30 text-zinc-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.sources.length > 0 && (
                    <div className="mt-3 border-t border-white/10 pt-2">
                      <p className="text-xs uppercase tracking-wide opacity-70">{t('dito', 'sources')}</p>
                      <ul className="mt-1 space-y-1">
                        {m.sources.map((s, i) => (
                          <li key={i}>
                            <a href={s.url} target="_blank" rel="noreferrer" className="text-xs underline opacity-80 hover:opacity-100">
                              {s.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && <p className="text-base text-zinc-500">{t('dito', 'thinking')}</p>}
          </div>
          <div ref={bottomRef} />
        </div>

        {notConfigured ? (
          <div className="border-t border-zinc-800 p-5 text-base text-gold">{t('dito', 'notConfigured')}</div>
        ) : (
          <div className="border-t border-zinc-800 p-4">
            {error && <p className="mb-2 text-sm text-magenta">{error}</p>}
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
                placeholder={t('dito', 'placeholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={sending}
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-3 text-base font-semibold text-black disabled:opacity-50"
              >
                {t('dito', 'send')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
