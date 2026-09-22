"use client";

import { useMemo, useState, useEffect } from "react";
import { HOMESTAY_STOP } from "../lib/bus-data";
import { findUnifiedTrips, unifiedStopNames, minutesToNowLabel, dayTypeOf, UnifiedTrip } from "../lib/schedule-utils";
import { useLanguage } from "../context/LanguageContext";

function getTaipeiNow(): { minutes: number; label: string; dateISO: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const h = Number(get("hour"));
  const m = Number(get("minute"));
  return {
    minutes: h * 60 + m,
    label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

const STOP_NAMES = unifiedStopNames();

export default function BusScheduleFinder() {
  const { t, sn, nt, rl } = useLanguage();
  const [origin, setOrigin] = useState("嘉義火車站");
  const [dest, setDest] = useState(HOMESTAY_STOP);
  const [showAll, setShowAll] = useState(false);
  // 「現在時間」和依日期篩選的班次都跟實際掛鐘時間有關，SSR 與 CSR 首次渲染的時間點不可能完全一致，
  // 故意在掛載後才計算並顯示，避免 hydration mismatch（React error #418）
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState({ minutes: 0, label: "--:--", dateISO: "" });
  const [date, setDate] = useState("");

  useEffect(() => {
    const initial = getTaipeiNow();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(initial);
    setDate(initial.dateISO);
    setMounted(true);
    const id = setInterval(() => setNow(getTaipeiNow()), 30000);
    return () => clearInterval(id);
  }, []);

  const isToday = date === now.dateISO;
  const dayType = useMemo(() => dayTypeOf(date), [date]);

  const allTrips: UnifiedTrip[] = useMemo(() => {
    if (origin === dest) return [];
    return findUnifiedTrips(origin, dest, dayType);
  }, [origin, dest, dayType]);

  const nextTrips = useMemo(
    () => (isToday ? allTrips.filter((tr) => tr.departMinutes >= now.minutes).slice(0, 8) : allTrips),
    [allTrips, now, isToday]
  );

  function swap() {
    setOrigin(dest);
    setDest(origin);
  }

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-8">
        <p className="mb-4 text-xs text-ink-soft">{t.finderIntro}</p>
        <div className="h-64 animate-pulse rounded-lg bg-paper-dim" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-8">
      <p className="mb-4 text-xs text-ink-soft">{t.finderIntro}</p>

      {/* 起訖站選擇 */}
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">{t.originLabel}</span>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-ink focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
          >
            {STOP_NAMES.map((s) => (
              <option key={s} value={s}>
                {sn(s)}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={swap}
          aria-label={t.swapAria}
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-soft hover:bg-paper-dim"
        >
          ⇄
        </button>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">{t.destLabel}</span>
          <select
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-ink focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
          >
            {STOP_NAMES.map((s) => (
              <option key={s} value={s}>
                {sn(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 日期選擇 */}
      <label className="mt-4 block max-w-xs">
        <span className="mb-1 block text-sm font-medium text-ink">{t.dateLabel}</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-ink focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
        />
      </label>

      {/* 現在時間 */}
      <p className="mt-4 text-sm text-ink-soft">
        {t.nowLabelPrefix}{" "}
        <span className="font-mono font-medium text-ink">{now.label}</span>
        {"　"}
        {isToday ? t.showingToday : t.showingOtherDate(date, dayType === "weekend")}
      </p>

      {/* 結果 */}
      <div className="mt-6">
        {origin === dest ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{t.pickDifferentStops}</p>
        ) : allTrips.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t.noDirectTrips(sn(origin), sn(dest))}
          </p>
        ) : nextTrips.length > 0 ? (
          <ul className="divide-y divide-paper-dim">
            {nextTrips.map((trip, i) => {
              const isOriginStop = trip.tripOriginName === origin;
              return (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs font-medium text-pine-dark">
                    {rl(trip.routeLabel)}
                  </span>
                  <span className="font-mono text-lg font-semibold text-pine-dark">{trip.departTime}</span>
                  {trip.arriveTime && (
                    <>
                      <span className="text-ink-soft">→</span>
                      <span className="font-mono text-ink-soft">{trip.arriveTime}</span>
                      {trip.estimated && <span className="text-xs text-ink-soft">{t.estimatedTag}</span>}
                    </>
                  )}
                  {trip.note && <span className="text-xs text-ink-soft">({nt(trip.note)})</span>}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {isToday && (
                    <span className="flex flex-col items-end gap-0.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          i === 0 ? "bg-pine/15 text-pine-dark" : "bg-paper-dim text-ink-soft"
                        }`}
                      >
                        {minutesToNowLabel(trip.departMinutes - now.minutes, isOriginStop)}
                      </span>
                      {!isOriginStop && <span className="text-xs text-red-600">{t.passingStopDelayNotice}</span>}
                    </span>
                  )}
                  {trip.fareFull != null ? (
                    <span className="text-right text-ink-soft">
                      <span className="block">
                        {t.fareCash}　{t.fareFull} NT${trip.fareFull}／{t.fareHalf} NT${trip.fareHalf}
                      </span>
                      {trip.cardFareFull != null && (
                        <span className="block">
                          {t.fareCard}　{t.fareFull} NT${trip.cardFareFull}／{t.fareHalf} NT${trip.cardFareHalf}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-ink-soft">{t.fareUnknown}</span>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-lg bg-paper-dim px-4 py-3 text-sm text-ink-soft">{t.doneForToday}</p>
        )}
      </div>

      {/* 完整時刻表（僅今天模式需要，其他日期已直接顯示全部） */}
      {isToday && (
        <div className="mt-6 border-t border-paper-dim pt-4">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-sm font-medium text-pine hover:underline"
          >
            {t.showFullTimetable(showAll, sn(origin), sn(dest), allTrips.length)}
          </button>
          {showAll && allTrips.length > 0 && (
            <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-ink-soft sm:grid-cols-2">
              {allTrips.map((trip, i) => (
                <li key={i} className="font-mono">
                  [{rl(trip.routeLabel)}] {trip.departTime}
                  {trip.arriveTime ? ` → ${trip.arriveTime}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
