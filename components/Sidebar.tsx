'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useLanguage, LanguageToggle } from '@/components/LanguageProvider';
import { TRANSLATIONS } from '@/lib/i18n';

const NAV_ITEMS: { href: string; key: keyof typeof TRANSLATIONS.nav; icon: string; adminOnly?: boolean }[] = [
  { href: '/dashboard', key: 'overview', icon: '■' },
  { href: '/dashboard/reports', key: 'reports', icon: '📊' },
  { href: '/dashboard/dito', key: 'dito', icon: '✳' },
  { href: '/dashboard/generate', key: 'generate', icon: '✨' },
  { href: '/dashboard/schedule', key: 'schedule', icon: '📅' },
  { href: '/dashboard/socials', key: 'socials', icon: '🔗' },
  { href: '/dashboard/email', key: 'email', icon: '📧' },
  { href: '/dashboard/website', key: 'website', icon: '🌐' },
  { href: '/dashboard/ads', key: 'ads', icon: '📈' },
  { href: '/dashboard/merch', key: 'merch', icon: '🛍' },
  { href: '/dashboard/platforms', key: 'platforms', icon: '🎧' },
  { href: '/dashboard/playlists', key: 'playlists', icon: '🎵' },
  { href: '/dashboard/shows', key: 'shows', icon: '🎤' },
  { href: '/dashboard/contacts', key: 'contacts', icon: '📇' },
  { href: '/dashboard/ideas', key: 'ideas', icon: '💡' },
  { href: '/dashboard/milestones', key: 'milestones', icon: '🎯' },
  { href: '/dashboard/mando-avispate', key: 'mandoAvispate', icon: '⚡' },
  { href: '/dashboard/activity', key: 'activity', icon: '🕓' },
  { href: '/dashboard/admin', key: 'admin', icon: '👥', adminOnly: true },
  { href: '/dashboard/settings', key: 'settings', icon: '⚙' },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();

  const role = session?.user?.role;

  return (
    <aside
      className="flex h-full max-h-screen w-full flex-col border-r border-zinc-800 bg-panel lg:h-screen"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Compact on short screens (iPad landscape, small laptops) so the nav
          doesn't get squeezed into a tiny scroll area. */}
      <div className="relative flex shrink-0 flex-col items-center gap-2 overflow-hidden border-b border-zinc-800 px-4 py-4 xl:gap-3 xl:py-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
          style={{ background: 'linear-gradient(90deg, transparent, #ff2e88, #3ee6e6, transparent)' }}
        />
        <div className="relative rounded-md p-[2px]" style={{ background: 'linear-gradient(135deg, #ff2e88, #3ee6e6)' }}>
          <Image
            src="/mando-el-pelado-logo.png"
            alt="Mando El Pelado"
            width={120}
            height={78}
            className="w-20 rounded-[5px] bg-white p-1.5 xl:w-28 xl:p-2"
          />
        </div>
        <Image
          src="/3er-mundo-logo.png"
          alt="3ER MUNDO"
          width={90}
          height={52}
          className="w-14 opacity-90 xl:w-20"
        />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3 xl:space-y-1.5 xl:px-4 xl:py-4">
        {NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin').map((item) => {
          const active = item.href === '/dashboard' ? pathname === item.href : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`relative flex items-center gap-3 overflow-hidden rounded-md px-3 py-2.5 text-base transition-all duration-150 xl:px-4 xl:py-3 ${
                active
                  ? 'bg-gradient-to-r from-magenta/25 via-cyan/10 to-transparent text-white shadow-[0_0_20px_-6px_rgba(62,230,230,0.5)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white hover:translate-x-0.5'
              }`}
            >
              {active && (
                <span
                  className="absolute inset-y-0 left-0 w-[3px]"
                  style={{
                    background: 'linear-gradient(180deg, #ff2e88, #3ee6e6)',
                    boxShadow: '0 0 12px 1px rgba(62,230,230,0.7)',
                  }}
                />
              )}
              {item.href === '/dashboard/dito' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/dito-avatar.jpg"
                  alt=""
                  className={`h-6 w-6 shrink-0 rounded-full object-cover ${active ? 'ring-2 ring-cyan/60' : ''}`}
                />
              ) : (
                <span className={`shrink-0 text-lg transition-transform ${active ? 'scale-110' : ''}`}>{item.icon}</span>
              )}
              <span className="truncate">{t('nav', item.key)}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className="shrink-0 border-t border-zinc-800 px-4 py-3 xl:py-4"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <LanguageToggle className="mb-2.5" />
        <div className="flex items-center gap-2.5">
          {session?.user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.avatarUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-cyan/30"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-magenta to-cyan text-sm font-bold text-black ring-2 ring-cyan/30">
              {(session?.user?.name || '?').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-white">{session?.user?.name}</p>
            <p className="truncate text-sm text-gold">{role ? t('roles', role) : ''}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-2.5 w-full rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-magenta hover:text-white"
        >
          {t('nav', 'signOut')}
        </button>
      </div>
    </aside>
  );
}
