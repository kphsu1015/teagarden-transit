"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "../../context/LanguageContext";
import { MapPinIcon } from "../../components/icons";
import { MAP_URL, ADDRESS } from "../../lib/site";

interface PhotoInfo {
  src: string;
  alt: string;
  caption: string;
  warning?: boolean;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.25em] text-gold">
      <span className="h-px w-6 bg-gold" />
      {children}
    </p>
  );
}

function WarningPhoto({ src, alt, caption, onOpen }: PhotoInfo & { onOpen: (photo: PhotoInfo) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ src, alt, caption, warning: true })}
      className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-xl text-left"
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, 300px"
        className="object-cover transition-transform duration-200 group-hover:scale-105"
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-amber-800/85 px-2 py-1.5 text-xs font-medium leading-4 tracking-tight text-white">
        ⚠ {caption}
      </figcaption>
    </button>
  );
}

function InfoPhoto({ src, alt, caption, onOpen }: PhotoInfo & { onOpen: (photo: PhotoInfo) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ src, alt, caption })}
      className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-xl text-left"
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, 400px"
        className="object-cover transition-transform duration-200 group-hover:scale-105"
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-pine-dark/85 px-2 py-1.5 text-xs font-medium leading-4 tracking-tight text-white">
        {caption}
      </figcaption>
    </button>
  );
}

export default function DrivePage() {
  const { t, lang } = useLanguage();
  const address = ADDRESS[lang];
  const [openPhoto, setOpenPhoto] = useState<PhotoInfo | null>(null);

  useEffect(() => {
    if (!openPhoto) return;

    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenPhoto(null);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPhoto]);

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

      <h2 className="mt-8 font-serif text-lg text-ink">{t.driveUpTitle}</h2>

      <p className="mt-4 text-sm font-medium text-ink-soft">{t.driveVideosLabel}</p>
      <a
        href="https://reurl.cc/969l0d"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-sm text-pine underline decoration-gold-soft decoration-2 underline-offset-4 hover:text-pine-dark"
      >
        {t.driveVideo1}
      </a>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <WarningPhoto
          src="/images/drive-avoid-gongtian.png"
          alt="Shizhuo / Longmei / Alishan junction"
          caption={t.driveCaption1}
          onOpen={setOpenPhoto}
        />
        <WarningPhoto
          src="/images/drive-avoid-indigo.png"
          alt="Hotel Indigo junction"
          caption={t.driveCaption2}
          onOpen={setOpenPhoto}
        />
        <WarningPhoto
          src="/images/drive-slope-up.png"
          alt="Slope up to the B&B at 57.9km"
          caption={t.driveCaption3}
          onOpen={setOpenPhoto}
        />
      </div>

      <h2 className="mt-8 font-serif text-lg text-ink">{t.driveReturnTitle}</h2>

      <p className="mt-4 text-sm font-medium text-ink-soft">{t.driveVideosLabel}</p>
      <a
        href="https://reurl.cc/r3Vekx"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-sm text-pine underline decoration-gold-soft decoration-2 underline-offset-4 hover:text-pine-dark"
      >
        {t.driveVideo2}
      </a>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <InfoPhoto
          src="/images/drive-return-entrance.jpg"
          alt="Tea Garden B&B entrance sign when returning from Alishan or Fenqihu"
          caption={t.driveReturnPhoto1Caption}
          onOpen={setOpenPhoto}
        />
        <InfoPhoto
          src="/images/drive-return-slope.jpg"
          alt="Slope leading up to the B&B, about 200m from the entrance"
          caption={t.driveReturnPhoto2Caption}
          onOpen={setOpenPhoto}
        />
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

      {openPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <button
            type="button"
            onClick={() => setOpenPhoto(null)}
            aria-label={t.mapZoomClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white transition-colors hover:bg-white/20"
          >
            ×
          </button>

          <figure
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl"
          >
            <div className="relative h-[70vh] w-full">
              <Image
                src={openPhoto.src}
                alt={openPhoto.alt}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-contain"
              />
            </div>
            <figcaption
              className={`px-3 py-2 text-sm font-medium text-white ${
                openPhoto.warning ? "bg-amber-800/90" : "bg-pine-dark/90"
              }`}
            >
              {openPhoto.warning ? "⚠ " : ""}
              {openPhoto.caption}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
