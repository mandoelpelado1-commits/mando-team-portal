'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/components/LanguageProvider';

interface TeamMember {
  id: number;
  name: string;
}

interface Idea {
  id: number;
  content: string;
  createdAt: string;
  author: TeamMember;
  acknowledgedBy: { userId: number; name: string; acknowledgedAt: string }[];
}

export default function IdeasPage() {
  const { data: session } = useSession();
  const { t, lang } = useLanguage();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIdea, setNewIdea] = useState('');
  const [posting, setPosting] = useState(false);

  const userId = session?.user?.id ? Number(session.user.id) : null;
  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  async function load() {
    setLoading(true);
    const res = await fetch('/api/ideas');
    const data = await res.json();
    setIdeas(data.ideas || []);
    setTeam(data.team || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function postIdea() {
    if (!newIdea.trim()) return;
    setPosting(true);
    await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newIdea.trim() }),
    });
    setNewIdea('');
    setPosting(false);
    load();
  }

  async function acknowledge(ideaId: number) {
    await fetch(`/api/ideas/${ideaId}/acknowledge`, { method: 'POST' });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-4xl tracking-wide text-white">{t('ideas', 'title')}</h1>
      <p className="mt-2 text-base text-zinc-400">{t('ideas', 'subtitle')}</p>

      <div className="mt-6 max-w-2xl rounded-xl border border-zinc-800 bg-panel p-6">
        <label className="mb-2 block text-sm uppercase tracking-wide text-zinc-400">{t('ideas', 'newIdea')}</label>
        <textarea
          className="h-28 w-full rounded-md border border-zinc-700 bg-black/40 px-4 py-3 text-base outline-none focus:border-magenta"
          placeholder={t('ideas', 'placeholder')}
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
        />
        <button
          onClick={postIdea}
          disabled={posting || !newIdea.trim()}
          className="mt-4 rounded-md bg-gradient-to-r from-magenta to-cyan px-5 py-2.5 text-base font-semibold text-black disabled:opacity-50"
        >
          {posting ? t('ideas', 'posting') : t('ideas', 'post')}
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-lg text-zinc-400">{t('common', 'loading')}</p>
      ) : (
        <div className="mt-8 max-w-2xl space-y-5">
          {ideas.length === 0 && <p className="text-base text-zinc-500">{t('ideas', 'noIdeas')}</p>}
          {ideas.map((idea) => {
            const ackedIds = new Set(idea.acknowledgedBy.map((a) => a.userId));
            const iAcked = userId !== null && ackedIds.has(userId);
            return (
              <div key={idea.id} className="rounded-xl border border-zinc-800 bg-panel p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-base font-semibold text-white">{idea.author.name}</p>
                  <p className="text-sm text-zinc-500">{new Date(idea.createdAt).toLocaleString(locale)}</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-base text-zinc-200">{idea.content}</p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {team.map((member) => {
                    const acked = ackedIds.has(member.id);
                    return (
                      <span
                        key={member.id}
                        className={`rounded-full border px-3 py-1 text-sm ${
                          acked ? 'border-cyan/40 bg-cyan/10 text-cyan' : 'border-zinc-700 text-zinc-500'
                        }`}
                      >
                        {acked ? '✓ ' : ''}
                        {member.name}
                      </span>
                    );
                  })}
                </div>

                {!iAcked && (
                  <button
                    onClick={() => acknowledge(idea.id)}
                    className="mt-4 rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-magenta hover:text-white"
                  >
                    {t('ideas', 'acknowledge')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
