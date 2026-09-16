"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export interface MapViewData {
  title: string;
  imageUrl: string;
}

const DRAG_THRESHOLD_PX = 4;

export default function MapView({ tripMap }: { tripMap: MapViewData | null }) {
  const { t } = useLanguage();
  // 0 = 未放大, 1 = 全螢幕置中, 2 = 再放大一次（可任意拖曳移動查看細節）
  const [zoomLevel, setZoomLevel] = useState<0 | 1 | 2>(0);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (zoomLevel === 0) return;

    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setZoomLevel(0);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [zoomLevel]);

  function handlePointerDown(e: React.PointerEvent<HTMLImageElement>) {
    if (zoomLevel !== 2) return;
    const container = scrollRef.current;
    if (!container) return;

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    const container = scrollRef.current;
    if (!drag || !container || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
    }
    container.scrollLeft = drag.scrollLeft - dx;
    container.scrollTop = drag.scrollTop - dy;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    dragRef.current = null;
    setIsDragging(false);
    if (!drag.moved) {
      // 沒有拖曳到，視為單純點擊 → 縮回全螢幕置中大小
      setZoomLevel(1);
    }
  }

  if (!tripMap) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <h1 className="font-serif text-3xl text-ink">{t.mapPageTitle}</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">{t.mapEmpty}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <h1 className="font-serif text-3xl text-ink">{tripMap.title}</h1>
      <p className="mt-2 text-xs text-ink-soft/70">{t.mapSource}</p>

      <div className="mt-6 w-full overflow-hidden rounded-xl border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tripMap.imageUrl}
          alt={tripMap.title}
          onClick={() => setZoomLevel(1)}
          className="block h-auto w-full cursor-zoom-in"
        />
      </div>

      {zoomLevel > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomLevel(0)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <button
            type="button"
            onClick={() => setZoomLevel(0)}
            aria-label={t.mapZoomClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white transition-colors hover:bg-white/20"
          >
            ×
          </button>

          <div
            ref={scrollRef}
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: zoomLevel === 2 ? "none" : "auto" }}
            className="max-h-[90vh] max-w-[95vw] overflow-auto overscroll-contain"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tripMap.imageUrl}
              alt={tripMap.title}
              draggable={false}
              onClick={() => {
                if (zoomLevel === 1) setZoomLevel(2);
              }}
              onContextMenu={(e) => {
                if (zoomLevel === 2) e.preventDefault();
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                touchAction: zoomLevel === 2 ? "none" : "auto",
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
              }}
              className={
                zoomLevel === 1
                  ? "block h-auto max-h-[90vh] w-auto max-w-[95vw] cursor-zoom-in select-none"
                  : `block h-auto w-[180vw] max-w-none select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}
