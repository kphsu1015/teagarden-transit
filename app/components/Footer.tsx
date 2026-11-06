"use client";

import Link from "next/link";
import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-pine-dark">
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-10 sm:pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-serif text-base tracking-[0.3em] text-on-dark">{t.siteTitle}</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-on-dark/60">{t.heroKicker}</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/bus" className="text-on-dark/80 hover:text-gold-soft">
              {t.navBus}
            </Link>
            <Link href="/rail" className="text-on-dark/80 hover:text-gold-soft">
              {t.navRail}
            </Link>
            <Link href="/drive" className="text-on-dark/80 hover:text-gold-soft">
              {t.navDrive}
            </Link>
            <Link href="/map" className="text-on-dark/80 hover:text-gold-soft">
              {t.navMap}
            </Link>
            <Link href="/"className="text-on-dark/80 hover:text-gold-soft">
              {t.backHome}
            </Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-xs leading-5 text-on-dark/70">{t.footer}</p>
          <p className="mt-3 text-xs text-on-dark/70">© 2026 Tea Garden B&B · 茶香花園民宿</p>
        </div>
      </div>
    </footer>
  );
}
