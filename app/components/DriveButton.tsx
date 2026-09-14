"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "../context/LanguageContext";
import { CarIcon } from "./icons";

function WarningPhoto({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-xl">
      <Image src={src} alt={alt} fill sizes="(max-width: 448px) 100vw, 448px" className="object-cover" />
      <figcaption className="absolute inset-x-0 bottom-0 bg-amber-800/85 px-3 py-2 text-sm font-medium leading-5 text-white">
        ⚠ {caption}
      </figcaption>
    </figure>
  );
}

export default function DriveButton({ mapUrl }: { mapUrl: string }) {
  const { t } = useLanguage();
  const [open, setOpenState] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenState(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenState(true)}
        className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-6 py-3 text-sm font-semibold text-sky-900 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-sky-200"
      >
        <CarIcon className="h-4 w-4" />
        {t.driveBtn}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpenState(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg text-ink">{t.driveModalTitle}</h3>

            <div className="mt-3 grid gap-3">
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
            </div>

            <p className="mt-3 text-sm leading-6 text-ink-soft">{t.driveModalDirections}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpenState(false)}
                className="rounded-full bg-pine px-5 py-2 text-sm font-medium text-white hover:bg-pine-dark"
              >
                {t.driveModalGo}
              </a>
              <button
                type="button"
                onClick={() => setOpenState(false)}
                className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink-soft hover:bg-paper-dim"
              >
                {t.driveModalClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
