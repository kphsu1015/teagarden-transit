"use client";

import { useEffect, useRef, useState } from "react";
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

function WarningPhoto({ src, alt, caption, onOpen }: PhotoInfo & { onOpen: (photo: PhotoInfo) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ src, alt, caption, warning: true })}
      className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-xl text-left"
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 300px"
        className="object-cover transition-transform duration-200 group-hover:scale-105"
      />
      <span className="absolute inset-x-0 bottom-0 block bg-amber-800/85 px-2 py-1.5 text-xs font-medium leading-4 tracking-tight text-white">
        ⚠ {caption}
      </span>
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
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 400px"
        className="object-cover transition-transform duration-200 group-hover:scale-105"
      />
      <span className="absolute inset-x-0 bottom-0 block bg-pine-dark/85 px-2 py-1.5 text-xs font-medium leading-4 tracking-tight text-white">
        {caption}
      </span>
    </button>
  );
}

export default function DrivePage() {
  const { t, lang } = useLanguage();
  const address = ADDRESS[lang];
  const [openPhoto, setOpenPhoto] = useState<PhotoInfo | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // 在點開照片的當下記住是哪張照片（關閉鈕的 autoFocus 會先搶走焦點，不能等到 effect 才記）
  const triggerRef = useRef<HTMLElement | null>(null);
  function openPhotoFrom(photo: PhotoInfo) {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setOpenPhoto(photo);
  }
  const isOpen = openPhoto !== null;

  useEffect(() => {
    if (!isOpen) return;

    // 關閉後把鍵盤焦點還給原本那張照片
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenPhoto(null);
      // 放大檢視只有一個可操作的按鈕，Tab 鎖在關閉鈕上，不會跑到被遮住的頁面
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <h1 className="font-serif text-3xl text-ink">{t.driveTitle}</h1>

      <p className="mt-4 text-sm leading-6 text-ink-soft">
        {t.driveAddressLabel}
        {address}
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{t.driveDirections}</p>
      <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{t.driveWarning}</p>

      <h2 className="mt-8 font-serif text-lg text-ink">{t.driveUpTitle}</h2>

      <p className="mt-4 text-sm font-medium text-ink-soft">{t.driveVideosLabel}</p>
      <a
        href="https://www.youtube.com/watch?v=9xLoKk5hU3k"
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
          onOpen={openPhotoFrom}
        />
        <WarningPhoto
          src="/images/drive-avoid-indigo.png"
          alt="Hotel Indigo junction"
          caption={t.driveCaption2}
          onOpen={openPhotoFrom}
        />
        <WarningPhoto
          src="/images/drive-slope-up.png"
          alt="Slope up to the B&B at 57.9km"
          caption={t.driveCaption3}
          onOpen={openPhotoFrom}
        />
      </div>

      <h2 className="mt-8 font-serif text-lg text-ink">{t.driveReturnTitle}</h2>

      <p className="mt-4 text-sm font-medium text-ink-soft">{t.driveVideosLabel}</p>
      <a
        href="https://www.youtube.com/watch?v=dJhemynuN0U"
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
          onOpen={openPhotoFrom}
        />
        <InfoPhoto
          src="/images/drive-return-slope.jpg"
          alt="Slope leading up to the B&B, about 200m from the entrance"
          caption={t.driveReturnPhoto2Caption}
          onOpen={openPhotoFrom}
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
          aria-label={openPhoto.caption}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
        >
          <button
            type="button"
            onClick={() => setOpenPhoto(null)}
            ref={closeRef}
            aria-label={t.mapZoomClose}
            autoFocus
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
                alt={openPhoto.caption}
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
