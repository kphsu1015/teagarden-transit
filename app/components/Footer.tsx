"use client";

import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-pine-dark">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-serif text-base tracking-[0.3em] text-paper">TEA GARDEN 茶香花園</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-paper/60">{t.heroKicker}</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="#bus" className="text-paper/80 hover:text-gold-soft">
              {t.navBus}
            </a>
            <a href="#rail" className="text-paper/80 hover:text-gold-soft">
              {t.navRail}
            </a>
            <a href="#top" className="text-paper/80 hover:text-gold-soft">
              ↑
            </a>
          </nav>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-xs leading-5 text-paper/50">{t.footer}</p>
          <p className="mt-3 text-xs text-paper/40">© 2026 Tea Garden B&B · 茶香花園民宿</p>
        </div>
      </div>
    </footer>
  );
}
