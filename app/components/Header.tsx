"use client";

import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../context/LanguageContext";

export default function Header() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-pine-dark">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
        <a href="#top" className="font-serif text-xs tracking-[0.25em] text-paper sm:text-sm sm:tracking-[0.3em]">
          TEA GARDEN 茶香花園
        </a>
        <nav className="flex items-center gap-3 sm:gap-4">
          <a href="#bus" className="hidden text-sm font-medium text-paper/85 hover:text-gold-soft sm:inline">
            {t.navBus}
          </a>
          <a href="#rail" className="hidden text-sm font-medium text-paper/85 hover:text-gold-soft sm:inline">
            {t.navRail}
          </a>
          <LanguageSwitcher dark />
        </nav>
      </div>
    </header>
  );
}
