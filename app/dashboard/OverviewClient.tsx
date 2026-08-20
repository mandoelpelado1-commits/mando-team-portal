'use client';

import { useLanguage } from '@/components/LanguageProvider';
import DailyBrief from '@/components/DailyBrief';

interface TeamMember {
  id: number;
  name: string;
  role: 'admin' | 'manager' | 'artist';
  location: string;
  avatarUrl: string | null;
}

interface UpcomingPost {
  id: number;
  platform: string;
  scheduledFor: string | null;
}

interface Props {
  userName: string;
  platforms: { platform: string; label: string; connected: boolean }[];
  connectedCount: number;
  upcomingPosts: UpcomingPost[];
  pendingBudgetCount: number;
  team: TeamMember[];
}

export default function OverviewClient({
  userName,
  platforms,
  connectedCount,
  upcomingPosts,
  pendingBudgetCount,
  team,
}: Props) {
  const { t, lang } = useLanguage();
  const locale = lang === 'es' ? 'es-EC' : 'en-US';

  return (
    <div>
      <h1 className="font-display text-4xl tracking-wide text-white">
        {t('overview', 'welcome')} {userName}
      </h1>
      <p className="mt-2 text-base text-zinc-400">{t('overview', 'subtitle')}</p>

      <div className="mt-8">
        <DailyBrief />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-panel p-6">
          <p className="text-sm uppercase tracking-wide text-zinc-400">{t('overview', 'socialsConnected')}</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {connectedCount} / {platforms.length}
          </p>
          <ul className="mt-4 space-y-2.5 text-base text-zinc-400">
            {platforms.map((p) => (
              <li key={p.platform} className="flex items-center justify-between gap-2">
                <span className="truncate">{p.label}</span>
                <span
                  className={`shrink-0 whitespace-nowrap text-sm ${p.connected ? 'text-cyan' : 'text-zinc-600'}`}
                >
                  {p.connected ? t('common', 'connected') : t('common', 'notConnected')}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-panel p-6">
          <p className="text-sm uppercase tracking-wide text-zinc-400">{t('overview', 'scheduledPosts')}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{upcomingPosts.length}</p>
          <ul className="mt-4 space-y-2 text-base text-zinc-400">
            {upcomingPosts.length === 0 && <li>{t('overview', 'nothingScheduled')}</li>}
            {upcomingPosts.map((p) => (
              <li key={p.id}>
                {p.platform} &middot; {p.scheduledFor ? new Date(p.scheduledFor).toLocaleString(locale) : ''}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-panel p-6">
          <p className="text-sm uppercase tracking-wide text-zinc-400">{t('overview', 'pendingApprovals')}</p>
          <p className="mt-2 text-3xl font-semibold text-gold">{pendingBudgetCount}</p>
          <p className="mt-4 text-base text-zinc-400">
            {pendingBudgetCount === 0 ? t('overview', 'noPending') : t('overview', 'reviewPending')}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-panel p-6">
        <p className="mb-4 text-sm uppercase tracking-wide text-zinc-400">{t('overview', 'team')}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black/30 p-4">
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-magenta to-cyan text-base font-bold text-black">
                  {member.name.trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{member.name}</p>
                <p className="truncate text-sm text-zinc-400">
                  {t('roles', member.role)} &middot; {member.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
