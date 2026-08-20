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
      <div className="flex shrink-0 flex-col items-center gap-2 border-b border-zinc-800 px-4 py-4 xl:gap-3 xl:py-6">
        <Image
          src="/mando-el-pelado-logo.png"
          alt="Mando El Pelado"
          width={120}
          height={78}
          className="w-20 rounded-md bg-white p-1.5 xl:w-28 xl:p-2"
        />
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
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-base transition xl:px-4 xl:py-3 ${
                active
                  ? 'border border-magenta/40 bg-gradient-to-r from-magenta/20 to-cyan/20 text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.href === '/dashboard/dito' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/dito-avatar.jpg" alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="shrink-0 text-lg">{item.icon}</span>
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
            <img src={session.user.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-magenta to-cyan text-sm font-bold text-black">
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
