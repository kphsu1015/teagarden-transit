"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Lang, UI, UIDict, stopName, noteText, farePairText, routeLabelText, trainNoText } from "../lib/i18n";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: UIDict;
  sn: (name: string) => string;
  nt: (note: string | undefined) => string | undefined;
  fp: (pair: string) => string;
  rl: (label: string) => string;
  tn: (no: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "teagarden-lang";
const HTML_LANG: Record<Lang, string> = { zh: "zh-Hant-TW", "zh-CN": "zh-CN", en: "en" };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    // 讀取先前儲存的語言偏好；故意在掛載後才切換，避免 SSR/CSR 輸出不一致造成 hydration 錯誤
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "zh" || saved === "zh-CN" || saved === "en") setLangState(saved);
    } catch {
      // localStorage 不可用時忽略，維持預設語言
    }
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 忽略儲存失敗
    }
  }

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);

  const value: LanguageContextValue = {
    lang,
    setLang,
    t: UI[lang],
    sn: (name: string) => stopName(name, lang),
    nt: (note: string | undefined) => noteText(note, lang),
    fp: (pair: string) => farePairText(pair, lang),
    rl: (label: string) => routeLabelText(label, lang),
    tn: (no: string) => trainNoText(no, lang),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
