import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatMessage, MESSAGES, TAG_ZH, type Lang, type MsgKey } from "./translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({ lang: "en", setLang: () => {} });

const STORAGE_KEY = "smh-lang";

function readStoredLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode) — the choice still applies this session.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const { lang, setLang } = useContext(LanguageContext);

  const t = useCallback(
    (key: MsgKey, params?: Record<string, string | number>) => formatMessage(MESSAGES[key][lang], params),
    [lang],
  );

  /** Translates a canonical English tag/label for display; falls back to the label itself. */
  const tTag = useCallback(
    (label: string) => (lang === "zh" ? (TAG_ZH[label] ?? label) : label),
    [lang],
  );

  return { lang, setLang, t, tTag };
}
