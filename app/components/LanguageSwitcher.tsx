"use client";

import { useLanguage } from "../context/LanguageContext";
import type { Lang } from "../lib/i18n";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "zh", label: "繁中" },
  { value: "zh-CN", label: "简中" },
  { value: "en", label: "EN" },
];

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`inline-flex shrink-0 rounded-full p-0.5 text-xs backdrop-blur-sm ${
        dark ? "border border-white/25 bg-white/10" : "border border-line bg-paper"
      }`}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLang(opt.value)}
          className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
            lang === opt.value
              ? dark
                ? "bg-gold text-pine-dark"
                : "bg-pine text-paper"
              : dark
                ? "text-paper/80 hover:bg-white/10"
                : "text-ink-soft hover:bg-paper-dim"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
