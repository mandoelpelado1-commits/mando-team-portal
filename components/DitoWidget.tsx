'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function DitoWidget() {
  const { t, lang } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Don't show a "chat with DITO" bubble on top of the actual DITO page.
  const hideOnDitoPage = pathname === '/dashboard/dito';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function ensureConversation(): Promise<number> {
    if (conversationId) return conversationId;
    const listRes = await fetch('/api/dito/conversations');
    const list = await listRes.json();
    if (list.conversations?.length) {
      const id = list.conversations[0].id;
      setConversationId(id);
      const msgRes = await fetch(`/api/dito/conversations/${id}`);
      const msgData = await msgRes.json();
      setMessages((msgData.messages || []).slice(-6));
      return id;
    }
    const createRes = await fetch('/api/dito/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Quick chat' }),
    });
    const created = await createRes.json();
    setConversationId(created.id);
    return created.id;
  }

  async function openWidget() {
    setOpen(true);
    await ensureConversation();
  }

  async function send() {
    if (!input.trim()) return;
    setError('');
    const id = await ensureConversation();
    const text = input.trim();
    setMessages((m) => [...m, { id: Date.now(), role: 'user', content: text, createdAt: new Date().toISOString() }]);
    setInput('');
    setSending(true);
    try {
      const res = await fetch(`/api/dito/conversations/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', content: data.reply, createdAt: new Date().toISOString() }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (hideOnDitoPage) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-x-4 bottom-24 z-50 flex max-h-[70vh] flex-col rounded-xl border border-zinc-800 bg-panel shadow-2xl sm:inset-x-auto sm:right-6 sm:w-96">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/dito-avatar.jpg" alt="DITO" className="h-8 w-8 rounded-full object-cover" />
              <p className="font-display text-lg tracking-wide text-white">DITO</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/dito" className="text-sm text-cyan hover:underline" onClick={() => setOpen(false)}>
                {lang === 'es' ? 'Abrir completo' : 'Open full'}
              </Link>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white" aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          <div className="min-h-[200px] flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && !sending && (
              <p className="text-sm text-zinc-500">{t('dito', 'emptyState')}</p>
            )}
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === 'user' ? 'bg-gradient-to-r from-magenta to-cyan text-black' : 'border border-zinc-800 bg-black/30 text-zinc-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {sending && <p className="text-sm text-zinc-500">{t('dito', 'thinking')}</p>}
            </div>
            <div ref={bottomRef} />
          </div>

          {error && <p className="px-4 text-sm text-magenta">{error}</p>}

          <div className="border-t border-zinc-800 p-3">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-magenta"
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
                className="rounded-md bg-gradient-to-r from-magenta to-cyan px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {t('dito', 'send')}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => (open ? setOpen(false) : openWidget())}
        aria-label="DITO"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-magenta to-cyan text-xl font-bold text-black shadow-lg shadow-black/40 transition hover:scale-105"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {open ? (
          '✕'
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/dito-avatar.jpg" alt="DITO" className="h-full w-full object-cover" />
        )}
      </button>
    </>
  );
}
