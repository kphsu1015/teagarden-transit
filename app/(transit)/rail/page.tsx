"use client";

import RailScheduleCard from "../../components/RailScheduleCard";
import { HOMESTAY_STOP } from "../../lib/bus-data";
import { useLanguage } from "../../context/LanguageContext";

export default function RailPage() {
  const { t, sn } = useLanguage();
  const homestayStop = sn(HOMESTAY_STOP);

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <h1 className="font-serif text-3xl text-ink">{t.railSectionTitle}</h1>
      <p className="mt-4 text-sm leading-6 text-ink-soft">{t.railCardBody(homestayStop)}</p>
      <p className="mt-3 text-sm leading-6 text-ink-soft">{t.railSectionBody(homestayStop)}</p>
      <div className="mt-6">
        <RailScheduleCard />
      </div>
    </section>
  );
}
