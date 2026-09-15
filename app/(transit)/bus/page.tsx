"use client";

import BusScheduleFinder from "../../components/BusScheduleFinder";
import { HOMESTAY_STOP } from "../../lib/bus-data";
import { useLanguage } from "../../context/LanguageContext";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.25em] text-gold">
      <span className="h-px w-6 bg-gold" />
      {children}
    </p>
  );
}

export default function BusPage() {
  const { t, sn } = useLanguage();
  const homestayStop = sn(HOMESTAY_STOP);

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <Eyebrow>{t.eyebrowBus}</Eyebrow>
      <h1 className="mt-3 font-serif text-3xl text-ink">{t.busSectionTitle}</h1>
      <p className="mt-4 text-sm leading-6 text-ink-soft">{t.busCardBody(homestayStop)}</p>
      <p className="mt-3 text-sm leading-6 text-ink-soft">{t.busSectionBody(homestayStop)}</p>
      <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-800">{t.busSectionWarn(homestayStop)}</p>
      <div className="mt-6">
        <BusScheduleFinder />
      </div>
    </section>
  );
}
