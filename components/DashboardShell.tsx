'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever navigation happens.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll while the drawer is open on touch devices.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape closes the drawer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="lg:flex">
      {/* Mobile / tablet top bar */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-800 bg-panel/95 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 active:bg-white/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Image
          src="/mando-el-pelado-logo.png"
          alt="Mando El Pelado"
          width={72}
          height={46}
          className="rounded bg-white p-1"
        />
      </header>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar: off-canvas drawer below lg, static column at lg+ */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs transform transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-72 lg:max-w-none lg:translate-x-0 xl:w-80 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>

      <main
        className="min-h-screen flex-1 overflow-x-hidden bg-ink px-4 py-6 sm:px-6 md:px-8 lg:py-8"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {children}
      </main>
    </div>
  );
}
