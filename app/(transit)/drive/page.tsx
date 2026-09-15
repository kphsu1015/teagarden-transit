"use client";

import Image from "next/image";
import { useLanguage } from "../../context/LanguageContext";
import { MapPinIcon } from "../../components/icons";
import { MAP_URL, ADDRESS } from "../../lib/site";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.25em] text-gold">
      <span className="h-px w-6 bg-gold" />
      {children}
    </p>
  );
}

function WarningPhoto({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-xl">
      <Image src={src} alt={alt} fill sizes="(max-width: 640px) 100vw, 300px" className="object-cover" />
      <figcaption className="absolute inset-x-0 bottom-0 bg-amber-800/85 px-2 py-1.5 text-xs font-medium leading-4 tracking-tight text-white">
        ⚠ {caption}
      </figcaption>
    </figure>
  );
}

export default function DrivePage() {
  const { t, lang } = useLanguage();
  const address = ADDRESS[lang];

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <Eyebrow>{t.eyebrowDrive}</Eyebrow>
      <h1 className="mt-3 font-serif text-3xl text-ink">{t.driveTitle}</h1>

      <p className="mt-4 text-sm leading-6 text-ink-soft">
        {t.driveAddressLabel}
        {address}
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{t.driveDirections}</p>
      <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{t.driveWarning}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <WarningPhoto
          src="/images/drive-avoid-gongtian.png"
          alt="Shizhuo / Longmei / Alishan junction"
          caption={t.driveCaption1}
        />
        <WarningPhoto
          src="/images/drive-avoid-indigo.png"
          alt="Hotel Indigo junction"
          caption={t.driveCaption2}
        />
        <WarningPhoto
          src="/images/drive-slope-up.png"
          alt="Slope up to the B&B at 57.9km"
          caption={t.driveCaption3}
        />
      </div>

      <p className="mt-6 text-sm font-medium text-ink-soft">{t.driveVideosLabel}</p>
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

      <a
        href={MAP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-pine px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5 hover:bg-pine-dark"
      >
        <MapPinIcon className="h-4 w-4" />
        {t.openInMaps}
      </a>
    </section>
  );
}
