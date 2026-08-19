'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Lang, TRANSLATIONS, translate } from '@/lib/i18n';

type Section = keyof typeof TRANSLATIONS;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: <S extends Section>(section: S, key: keyof (typeof TRANSLATIONS)[S]) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'es',
  setLang: () => {},
  t: (section, key) => String(key),
});

const STORAGE_KEY = 'mando-portal-lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') setLangState(stored);
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = <S extends Section>(section: S, key: keyof (typeof TRANSLATIONS)[S]) => translate(section, key, lang);

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={`flex overflow-hidden rounded-full border border-zinc-700 ${className}`}>
      {(['es', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`flex-1 px-3 py-1.5 text-sm font-semibold transition ${
            lang === l ? 'bg-gradient-to-r from-magenta to-cyan text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {l === 'es' ? 'ES' : 'EN'}
        </button>
      ))}
    </div>
  );
}
