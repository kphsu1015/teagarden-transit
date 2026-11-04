"use client";

import { useEffect, useState } from "react";
import { RAIL_UPWARD, RAIL_DOWNWARD, RAIL_FARES, FENQIHU_ARRIVALS } from "../lib/rail-data";
import { getTaipeiNow } from "../lib/transit-assistant/taipei-time";
import type { RailTrip } from "../lib/rail-data";
import { HOMESTAY_STOP } from "../lib/bus-data";
import { findUnifiedTrips, timeToMinutes } from "../lib/schedule-utils";
import { useLanguage } from "../context/LanguageContext";
import { statusesFor, type TripStatus } from "../lib/rail-status";

// 火車最早抵達奮起湖的時間：早於這個時間發車的公車，旅客根本搭不上，不列入轉乘建議
const EARLIEST_FENQIHU_ARRIVAL = Math.min(...FENQIHU_ARRIVALS.map((a) => timeToMinutes(a.time)));

// 平日／假日班表在此段皆相同（僅涉及 A/B 線與 7302，皆不分平假日），固定用平日計算即可
const TRANSFER_TRIPS = findUnifiedTrips("奮起湖", HOMESTAY_STOP, "weekday").filter(
  (t) => t.departMinutes >= EARLIEST_FENQIHU_ARRIVAL // 只留下火車到站後才發車、銜接得上的班次
);

function TripRow({
  trip,
  status,
  sn,
  nt,
  tn,
}: {
  trip: RailTrip;
  status: TripStatus;
  sn: (n: string) => string;
  nt: (n: string | undefined) => string | undefined;
  tn: (n: string) => string;
}) {
  const { t } = useLanguage();
  const isPast = status?.kind === "past";
  return (
    <li className="py-3">
      {status?.kind === "next" && (
        <p className="mb-1.5 inline-flex rounded-full bg-pine/15 px-2.5 py-0.5 text-xs font-medium text-pine-dark">
          {t.railNextBadge(sn(status.stop), status.time, status.minutesLeft)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs font-medium text-pine-dark">
          {tn(trip.no)}
        </span>
        {/* 已發車用標籤標示，不把整列調淡，時刻仍清楚可讀 */}
        {isPast && (
          <span className="rounded-full bg-paper-dim px-2 py-0.5 text-xs font-medium text-ink-soft">
            {t.railDepartedTag}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-x-2 font-mono text-sm">
          {trip.segments.map((seg, i) => {
            // 這一站已經開走（終點站除外）：時間改灰色，但仍保持可讀的對比
            const passed =
              status !== null && i < trip.segments.length - 1 && timeToMinutes(seg.time) < status.nowMinutes;
            return (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-ink-soft">→</span>}
                <span className={passed ? "text-ink-soft" : "text-ink"}>
                  {sn(seg.stop)} {seg.time}
                </span>
              </span>
            );
          })}
        </div>
      </div>
      {trip.note && <p className="mt-1 text-xs text-ink-soft">※ {nt(trip.note)}</p>}
    </li>
  );
}

export default function RailScheduleCard() {
  const { t, sn, nt, rl, fp, tn } = useLanguage();
  // 台灣現在時間（當天分鐘數）：掛載後才算，每 30 秒更新一次
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowMinutes(getTaipeiNow().minutes);
    const id = setInterval(() => setNowMinutes(getTaipeiNow().minutes), 30000);
    return () => clearInterval(id);
  }, []);

  const upStatuses = statusesFor(RAIL_UPWARD, nowMinutes);
  const downStatuses = statusesFor(RAIL_DOWNWARD, nowMinutes);
  const allDeparted = (statuses: TripStatus[]) =>
    statuses.length > 0 && statuses.every((s) => s?.kind === "past");

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-8">
      <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t.railDisclaimer1}
        <strong>{t.railDisclaimerStrong}</strong>。
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink-soft">{t.railUpTitle}</h3>
          {allDeparted(upStatuses) && (
            <p className="mb-1 rounded-lg bg-paper-dim px-3 py-2 text-xs text-ink-soft">{t.railAllDeparted}</p>
          )}
          <ul className="divide-y divide-paper-dim">
            {RAIL_UPWARD.map((trip, i) => (
              <TripRow key={trip.no} trip={trip} status={upStatuses[i]} sn={sn} nt={nt} tn={tn} />
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink-soft">{t.railDownTitle}</h3>
          {allDeparted(downStatuses) && (
            <p className="mb-1 rounded-lg bg-paper-dim px-3 py-2 text-xs text-ink-soft">{t.railAllDeparted}</p>
          )}
          <ul className="divide-y divide-paper-dim">
            {RAIL_DOWNWARD.map((trip, i) => (
              <TripRow key={trip.no} trip={trip} status={downStatuses[i]} sn={sn} nt={nt} tn={tn} />
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 border-t border-paper-dim pt-4">
        <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink-soft">{t.transferTitle(sn(HOMESTAY_STOP))}</h3>
        {TRANSFER_TRIPS.length > 0 ? (
          <ul className="divide-y divide-paper-dim">
            {TRANSFER_TRIPS.map((tr, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs font-medium text-pine-dark">
                  {rl(tr.routeLabel)}
                </span>
                <span className="font-mono text-ink">
                  {sn("奮起湖")} {tr.departTime} → {sn(HOMESTAY_STOP)} {tr.arriveTime}
                  {tr.estimated && <span className="ml-1 font-sans text-xs text-ink-soft">{t.estimatedTag}</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">{t.transferNone}</p>
        )}
      </div>

      <div className="mt-6 border-t border-paper-dim pt-4">
        <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink-soft">{t.fareRefTitle}</h3>
        <ul className="grid grid-cols-1 gap-2 text-sm text-ink-soft sm:grid-cols-3">
          {RAIL_FARES.map((f) => (
            <li key={f.pair} className="rounded-lg bg-paper-dim px-3 py-2">
              <span className="block text-ink">{fp(f.pair)}</span>
              <span className="text-ink-soft">
                {t.fareFull} NT${f.full}／{t.fareHalf} NT${f.half}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <a
          href="https://afrch.forest.gov.tw/0000119"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-pine px-4 py-2 font-medium text-pine hover:bg-pine/10"
        >
          {t.officialTimetable}
        </a>
        <a
          href="https://afrts.forest.gov.tw/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-pine px-4 py-2 font-medium text-pine hover:bg-pine/10"
        >
          {t.onlineBooking}
        </a>
      </div>
    </div>
  );
}
