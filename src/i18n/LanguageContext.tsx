import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { categoryLabelsMs, strings, type Lang, type StringKey } from './strings';
import type { HistoricalEvent, Location, ShipComponent, Verification, Voyage } from '../data/types';

const STORAGE_KEY = 'kdht-lang';

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'ms' ? 'ms' : 'en';
  } catch {
    return 'en';
  }
}

interface LangApi {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  cat: (category: string) => string;
  vLabel: (v: Verification) => string;
  vHelp: (v: Verification) => string;
  eventTitle: (e: HistoricalEvent) => string;
  eventDescription: (e: HistoricalEvent) => string;
  locName: (l: Location) => string;
  voyageTitle: (v: Voyage) => string;
  componentName: (c: ShipComponent) => string;
}

const LangCtx = createContext<LangApi | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);
  useEffect(() => {
    document.documentElement.lang = lang === 'ms' ? 'ms' : 'en';
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* storage unavailable */ }
  }, []);

  const api = useMemo<LangApi>(() => {
    const t = (key: StringKey, vars?: Record<string, string | number>) => {
      let s: string = strings[lang][key] ?? strings.en[key] ?? key;
      if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, String(v)); });
      return s;
    };
    const vKey = (v: Verification) => v.replace(' ', '_') as 'Verified' | 'Needs_Verification' | 'Illustrative' | 'Disputed';
    const ms = lang === 'ms';
    return {
      lang,
      setLang,
      t,
      cat: (c) => (ms ? categoryLabelsMs[c] ?? c : c),
      vLabel: (v) => t(`v_${vKey(v)}` as StringKey),
      vHelp: (v) => t(`v_help_${vKey(v)}` as StringKey),
      // Malay fields are optional; English is used when a translation has not been written.
      eventTitle: (e) => (ms && e.Event_Title_MS) || e.Event_Title,
      eventDescription: (e) => (ms && e.Description_MS) || e.Description,
      locName: (l) => (ms && l.Location_Name_MS) || l.Location_Name,
      voyageTitle: (v) => (ms && v.Voyage_Title_MS) || v.Voyage_Title,
      componentName: (c) => (ms && c.Component_Name_MS) || c.Component_Name,
    };
  }, [lang, setLang]);

  return <LangCtx.Provider value={api}>{children}</LangCtx.Provider>;
}

export function useLang(): LangApi {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
