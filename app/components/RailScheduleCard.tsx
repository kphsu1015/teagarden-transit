"use client";

import { RAIL_UPWARD, RAIL_DOWNWARD, RAIL_FARES, FENQIHU_ARRIVALS } from "../lib/rail-data";
import type { RailTrip } from "../lib/rail-data";
import { HOMESTAY_STOP } from "../lib/bus-data";
import { findUnifiedTrips, timeToMinutes } from "../lib/schedule-utils";
import { useLanguage } from "../context/LanguageContext";

// 火車最早抵達奮起湖的時間：早於這個時間發車的公車，旅客根本搭不上，不列入轉乘建議
const EARLIEST_FENQIHU_ARRIVAL = Math.min(...FENQIHU_ARRIVALS.map((a) => timeToMinutes(a.time)));

// 平日／假日班表在此段皆相同（僅涉及 A/B 線與 7302，皆不分平假日），固定用平日計算即可
const TRANSFER_TRIPS = findUnifiedTrips("奮起湖", HOMESTAY_STOP, "weekday").filter(
  (t) => t.departMinutes >= EARLIEST_FENQIHU_ARRIVAL // 只留下火車到站後才發車、銜接得上的班次
);

function TripRow({
  trip,
  sn,
  nt,
  tn,
}: {
  trip: RailTrip;
  sn: (n: string) => string;
  nt: (n: string | undefined) => string | undefined;
  tn: (n: string) => string;
}) {
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs font-medium text-pine-dark">
          {tn(trip.no)}
        </span>
        <div className="flex flex-wrap items-center gap-x-2 font-mono text-sm text-ink">
          {trip.segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-line">→</span>}
              <span>
                {sn(seg.stop)} {seg.time}
              </span>
            </span>
          ))}
        </div>
      </div>
      {trip.note && <p className="mt-1 text-xs text-ink-soft">※ {nt(trip.note)}</p>}
    </li>
  );
}

export default function RailScheduleCard() {
  const { t, sn, nt, rl, fp, tn } = useLanguage();

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-8">
      <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t.railDisclaimer1}
        <strong>{t.railDisclaimerStrong}</strong>。
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink-soft">{t.railUpTitle}</h3>
          <ul className="divide-y divide-paper-dim">
            {RAIL_UPWARD.map((trip) => (
              <TripRow key={trip.no} trip={trip} sn={sn} nt={nt} tn={tn} />
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink-soft">{t.railDownTitle}</h3>
          <ul className="divide-y divide-paper-dim">
            {RAIL_DOWNWARD.map((trip) => (
              <TripRow key={trip.no} trip={trip} sn={sn} nt={nt} tn={tn} />
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
