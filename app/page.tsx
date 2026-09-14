"use client";

import BusScheduleFinder from "./components/BusScheduleFinder";
import RailScheduleCard from "./components/RailScheduleCard";
import DriveButton from "./components/DriveButton";
import { CarIcon, BusIcon, TrainIcon, MapPinIcon, WalkIcon } from "./components/icons";
import { HOMESTAY_STOP } from "./lib/bus-data";
import { useLanguage } from "./context/LanguageContext";

const MAP_URL = "https://maps.app.goo.gl/DZJ5KF8J9UqY6Dud8";
const ADDRESS_ZH = "嘉義縣番路鄉公田村龍頭9號";
const ADDRESS_SC = "嘉义县番路乡公田村龙头9号";
const ADDRESS_EN = "No. 9, Longtou, Gongtian Village, Fanlu Township, Chiayi County, Taiwan";
const ADDRESS: Record<string, string> = { zh: ADDRESS_ZH, "zh-CN": ADDRESS_SC, en: ADDRESS_EN };

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.25em] text-gold">
      <span className="h-px w-6 bg-gold" />
      {children}
    </p>
  );
}

export default function Home() {
  const { lang, t, sn } = useLanguage();
  const address = ADDRESS[lang];
  const homestayStop = sn(HOMESTAY_STOP);

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
            <a
              href="#bus"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-pine-dark shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-gold-soft"
            >
              <BusIcon className="h-4 w-4" />
              {t.navBus}
            </a>
            <a
              href="#rail"
              className="inline-flex items-center gap-2 rounded-full bg-rose-200 px-6 py-3 text-sm font-semibold text-rose-900 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-rose-300"
            >
              <TrainIcon className="h-4 w-4" />
              {t.navRail}
            </a>
            <DriveButton mapUrl={MAP_URL} />
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

      {/* 怎麼來 */}
      <section className="mx-auto max-w-4xl px-6 pb-4 pt-16 md:pt-20">
        <Eyebrow>{t.eyebrowHowTo}</Eyebrow>
        <h2 className="mt-3 font-serif text-3xl text-ink">{t.howToTitle}</h2>
        <div className="mt-8 grid gap-5">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-900">
                <CarIcon />
              </span>
              <p className="font-serif text-lg text-ink">{t.driveTitle}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink-soft">
              {t.driveAddressLabel}
              {address}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{t.driveDirections}</p>
            <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{t.driveWarning}</p>
            <p className="mt-4 text-sm font-medium text-ink-soft">{t.driveVideosLabel}</p>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <a
                href="https://reurl.cc/969l0d"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pine underline decoration-gold-soft decoration-2 underline-offset-4 hover:text-pine-dark"
              >
                {t.driveVideo1}
              </a>
              <a
                href="https://reurl.cc/r3Vekx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pine underline decoration-gold-soft decoration-2 underline-offset-4 hover:text-pine-dark"
              >
                {t.driveVideo2}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-pine-dark">
                <BusIcon />
              </span>
              <p className="font-serif text-lg text-ink">{t.busCardTitle}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink-soft">{t.busCardBody(homestayStop)}</p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-200 text-rose-900">
                <TrainIcon />
              </span>
              <p className="font-serif text-lg text-ink">{t.railCardTitle}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink-soft">{t.railCardBody(homestayStop)}</p>
          </div>
        </div>
      </section>

      {/* 公車查詢（台灣好行 + 在地公車 整合） */}
      <section id="bus" className="mx-auto max-w-4xl scroll-mt-16 px-6 py-16">
        <Eyebrow>{t.eyebrowBus}</Eyebrow>
        <h2 className="mt-3 font-serif text-3xl text-ink">{t.busSectionTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{t.busSectionBody(homestayStop)}</p>
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-800">{t.busSectionWarn(homestayStop)}</p>
        <div className="mt-6">
          <BusScheduleFinder />
        </div>
      </section>

      {/* 森林鐵路 */}
      <section id="rail" className="mx-auto max-w-4xl scroll-mt-16 px-6 py-16">
        <Eyebrow>{t.eyebrowRail}</Eyebrow>
        <h2 className="mt-3 font-serif text-3xl text-ink">{t.railSectionTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{t.railSectionBody(homestayStop)}</p>
        <div className="mt-6">
          <RailScheduleCard />
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
