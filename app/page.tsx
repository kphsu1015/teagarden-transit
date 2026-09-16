"use client";

import Link from "next/link";
import { CarIcon, BusIcon, MapIcon, TrainIcon, MapPinIcon, WalkIcon } from "./components/icons";
import { useLanguage } from "./context/LanguageContext";
import { MAP_URL, ADDRESS } from "./lib/site";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.25em] text-gold">
      <span className="h-px w-6 bg-gold" />
      {children}
    </p>
  );
}

export default function Home() {
  const { t, lang } = useLanguage();
  const address = ADDRESS[lang];

  const modes = [
    {
      href: "/drive",
      icon: <CarIcon className="h-6 w-6" />,
      iconWrap: "bg-sky-100 text-sky-900",
      title: t.driveTitle,
      body: t.driveDirections,
    },
    {
      href: "/bus",
      icon: <BusIcon className="h-6 w-6" />,
      iconWrap: "bg-gold text-pine-dark",
      title: t.busCardTitle,
      body: t.busSectionTitle,
    },
    {
      href: "/rail",
      icon: <TrainIcon className="h-6 w-6" />,
      iconWrap: "bg-rose-200 text-rose-900",
      title: t.railCardTitle,
      body: t.railSectionTitle,
    },
  ];

  return (
    <main id="top" className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pine-dark via-pine to-pine-dark">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(216,184,118,0.25), transparent 45%), radial-gradient(circle at 85% 0%, rgba(216,184,118,0.18), transparent 40%)",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-14 md:pb-32 md:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold-soft/40 bg-white/5 px-4 py-1.5 text-xs tracking-[0.3em] text-gold-soft">
            {t.heroKicker}
          </p>
          <h1 className="mt-6 font-serif text-4xl leading-tight text-paper md:text-6xl">
            {t.heroTitle1}
            <br />
            <span className="text-gold-soft">{t.heroTitle2}</span>
          </h1>
          <p className="mt-6 max-w-xl leading-8 text-paper/80">{t.heroP1}</p>
          <p className="mt-4 max-w-xl leading-8 text-paper/70">{t.heroP2}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/bus"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-pine-dark shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-gold-soft"
            >
              <BusIcon className="h-4 w-4" />
              {t.navBus}
            </Link>
            <Link
              href="/rail"
              className="inline-flex items-center gap-2 rounded-full bg-rose-200 px-6 py-3 text-sm font-semibold text-rose-900 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-rose-300"
            >
              <TrainIcon className="h-4 w-4" />
              {t.navRail}
            </Link>
            <Link
              href="/drive"
              className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-6 py-3 text-sm font-semibold text-sky-900 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-sky-200"
            >
              <CarIcon className="h-4 w-4" />
              {t.navDrive}
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-6 py-3 text-sm font-semibold text-emerald-900 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-emerald-200"
            >
              <MapIcon className="h-4 w-4" />
              {t.navMap}
            </Link>
          </div>
        </div>

        {/* 山巒剪影裝飾，銜接下方內容區塊 */}
        <svg
          className="absolute inset-x-0 bottom-0 h-24 w-full text-paper md:h-32"
          viewBox="0 0 1440 220"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0 160 L120 110 L260 150 L420 70 L560 140 L720 90 L900 150 L1080 100 L1260 150 L1440 120 L1440 220 L0 220 Z" fill="currentColor" opacity="0.12" />
          <path d="M0 190 L160 140 L340 180 L520 120 L700 175 L880 130 L1060 185 L1240 145 L1440 175 L1440 220 L0 220 Z" fill="currentColor" opacity="0.22" />
          <path d="M0 220 L1440 220 L1440 205 L1240 175 L1040 205 L840 165 L640 205 L440 175 L240 210 L0 195 Z" fill="currentColor" />
        </svg>
      </section>

      {/* Feature 浮卡，與 Hero 底部重疊，帶出 landing page 的層次感 */}
      <div className="relative z-10 mx-auto -mt-6 max-w-4xl px-6 md:-mt-10">
        <div className="grid grid-cols-1 divide-y divide-line rounded-2xl border border-line bg-white shadow-xl shadow-pine-dark/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { icon: <BusIcon className="h-5 w-5" />, text: t.featureRoutes },
            { icon: <WalkIcon className="h-5 w-5" />, text: t.featureWalk },
            { icon: <TrainIcon className="h-5 w-5" />, text: t.featureRail },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine/10 text-pine">
                {f.icon}
              </span>
              <span className="text-sm font-medium text-ink">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 怎麼來：三個分頁入口卡片 */}
      <section className="mx-auto max-w-4xl px-6 pb-4 pt-16 md:pt-20">
        <Eyebrow>{t.eyebrowHowTo}</Eyebrow>
        <h2 className="mt-3 font-serif text-3xl text-ink">{t.homeIntroTitle}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {modes.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group flex flex-col rounded-2xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${m.iconWrap}`}>
                {m.icon}
              </span>
              <p className="mt-4 font-serif text-lg text-ink">{m.title}</p>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-soft">{m.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-pine transition-transform group-hover:translate-x-1">
                {t.homeCardCta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 聯絡與資料來源 */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Eyebrow>{t.eyebrowContact}</Eyebrow>
        <h2 className="mt-3 font-serif text-3xl text-ink">{t.contactTitle}</h2>
        <div className="relative mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-pine-dark to-pine p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle at 90% 10%, rgba(216,184,118,0.3), transparent 45%)",
            }}
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold-soft">
                <MapPinIcon />
              </span>
              <p className="leading-7 text-paper/90">{address}</p>
            </div>
            <a
              href={MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-pine-dark hover:bg-gold-soft sm:self-auto"
            >
              <MapPinIcon className="h-4 w-4" />
              {t.openInMaps}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
