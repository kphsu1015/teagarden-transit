"use client";

import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../context/LanguageContext";

export default function Header() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-pine-dark">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
        <Link href="/" className="font-serif text-xs tracking-[0.25em] text-paper sm:text-sm sm:tracking-[0.3em]">
          TEA GARDEN 茶香花園
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link href="/bus" className="hidden text-sm font-medium text-paper/85 hover:text-gold-soft sm:inline">
            {t.navBus}
          </Link>
          <Link href="/rail" className="hidden text-sm font-medium text-paper/85 hover:text-gold-soft sm:inline">
            {t.navRail}
          </Link>
          <Link href="/drive" className="hidden text-sm font-medium text-paper/85 hover:text-gold-soft sm:inline">
            {t.navDrive}
          </Link>
          <Link href="/map" className="hidden text-sm font-medium text-paper/85 hover:text-gold-soft sm:inline">
            {t.navMap}
          </Link>
          <LanguageSwitcher dark />
        </nav>
      </div>
    </header>
  );
}
