"use client";

import BusScheduleFinder from "../../components/BusScheduleFinder";
import { HOMESTAY_STOP } from "../../lib/bus-data";
import { useLanguage } from "../../context/LanguageContext";

export default function BusPage() {
  const { t, sn } = useLanguage();
  const homestayStop = sn(HOMESTAY_STOP);

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <h1 className="font-serif text-3xl text-ink">{t.busSectionTitle}</h1>
      <div className="mt-6">
        <BusScheduleFinder />
      </div>

      {/* 說明文字保留原文，移到查詢框下方，手機上不用先滑過整段才看到班次 */}
      <div className="mt-10">
        <h2 className="font-serif text-lg text-ink">{t.busNotesTitle}</h2>
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm leading-6 text-amber-800">
          {t.busSectionWarn(homestayStop)}
        </p>
        <p className="mt-3 max-w-prose text-sm leading-7 text-ink-soft">{t.busCardBody(homestayStop)}</p>
        <p className="mt-3 max-w-prose text-sm leading-7 text-ink-soft">{t.busSectionBody(homestayStop)}</p>
      </div>
    </section>
  );
}
