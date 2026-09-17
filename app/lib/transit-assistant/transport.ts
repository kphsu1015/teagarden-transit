// 交通工具分類：讓交通小幫手能區分「公車」和「阿里山森林鐵路（火車）」，
// 不會把公車班次冒充成火車方案，也不會反過來。mode 一律由「資料來源」決定
// （bus-data.ts/local-bus-data.ts -> bus，rail-data.ts -> train），
// 絕不從路線名稱或文字內容用猜的。

import { findUnifiedTrips, type DayType } from "../schedule-utils";
import { RAIL_UPWARD, RAIL_DOWNWARD, RAIL_FARES, type RailTrip } from "../rail-data";
import { timeToMinutes } from "./taipei-time";

export type TransportMode = "train" | "bus" | "drive" | "taxi" | "any";

export const VALID_TRANSPORT_MODES: TransportMode[] = ["train", "bus", "drive", "taxi", "any"];

export function isValidTransportMode(v: unknown): v is TransportMode {
  return typeof v === "string" && (VALID_TRANSPORT_MODES as string[]).includes(v);
}

/** 有固定時刻表可查的交通方式；drive/taxi 沒有時刻表資料，另外用資訊性回覆處理 */
export type ScheduledMode = "bus" | "train";

export interface ModedTrip {
  mode: ScheduledMode;
  routeLabel: string;
  operator: string;
  departTime: string;
  arriveTime: string | null;
  fareFull: number | null;
  fareHalf: number | null;
  departMinutes: number;
  note?: string;
  /** 只有公車的在地路線（7302/7314）換算站點時會是 true；火車一律是官方公告時刻，不會是 estimated */
  estimated?: boolean;
}

const BUS_OPERATOR = "台灣好行阿里山線／嘉義縣公車";
const RAIL_OPERATOR = "阿里山林業鐵路及文化資產管理處";

export function findBusTrips(originKey: string, destKey: string, dayType: DayType): ModedTrip[] {
  return findUnifiedTrips(originKey, destKey, dayType).map((t) => ({
    mode: "bus",
    routeLabel: t.routeLabel,
    operator: BUS_OPERATOR,
    departTime: t.departTime,
    arriveTime: t.arriveTime,
    fareFull: t.fareFull,
    fareHalf: t.fareHalf,
    departMinutes: t.departMinutes,
    note: t.note,
    estimated: t.estimated,
  }));
}

// 公車站名 -> 森林鐵路站名對照（只有這兩站的公車站名和鐵路站名不同；奮起湖／北門兩邊寫法一樣）
const RAIL_STOP_BY_BUS_KEY: Record<string, string> = {
  嘉義火車站: "嘉義",
  阿里山轉運站: "阿里山",
};

/** 把「任何已解析出來的地點 key（公車站名或鐵路站名）」換成森林鐵路資料用的站名；查不到就代表火車不到那裡 */
export function toRailStopName(key: string): string | null {
  if (key === "奮起湖" || key === "北門" || key === "嘉義" || key === "阿里山") return key;
  return RAIL_STOP_BY_BUS_KEY[key] ?? null;
}

function railFareFor(originRail: string, destRail: string): { fareFull: number | null; fareHalf: number | null } {
  const bucket = (name: string) => (name === "嘉義" || name === "北門" ? "嘉義／北門" : name);
  const from = bucket(originRail);
  const to = bucket(destRail);
  const pair = RAIL_FARES.find((f) => f.pair === `${from} ↔ ${to}` || f.pair === `${to} ↔ ${from}`);
  return pair ? { fareFull: pair.full, fareHalf: pair.half } : { fareFull: null, fareHalf: null };
}

function tripsFromRailList(list: RailTrip[], originName: string, destName: string): ModedTrip[] {
  const fare = railFareFor(originName, destName);
  const out: ModedTrip[] = [];
  for (const trip of list) {
    const oi = trip.segments.findIndex((s) => s.stop === originName);
    const di = trip.segments.findIndex((s) => s.stop === destName);
    // 火車只有明確停靠兩站、且方向正確（先到 origin 再到 destination）才算數；
    // 不會用其他班次的時刻去內插估計，資料沒有就是沒有。
    if (oi === -1 || di === -1 || oi >= di) continue;
    const dep = trip.segments[oi].time;
    const arr = trip.segments[di].time;
    out.push({
      mode: "train",
      routeLabel: trip.no,
      operator: RAIL_OPERATOR,
      departTime: dep,
      arriveTime: arr,
      fareFull: fare.fareFull,
      fareHalf: fare.fareHalf,
      departMinutes: timeToMinutes(dep),
      note: trip.note,
      estimated: false,
    });
  }
  return out;
}

/** 查詢兩個「已經換成鐵路站名可用格式」的地點之間的森林鐵路班次；查不到鐵路站名對應時回傳空陣列（代表火車不到） */
export function findTrainTrips(originKey: string, destKey: string): ModedTrip[] {
  const originRail = toRailStopName(originKey);
  const destRail = toRailStopName(destKey);
  if (!originRail || !destRail) return [];
  const up = tripsFromRailList(RAIL_UPWARD, originRail, destRail);
  const down = tripsFromRailList(RAIL_DOWNWARD, originRail, destRail);
  return [...up, ...down].sort((a, b) => a.departMinutes - b.departMinutes);
}

/** 依 transportMode 找出候選班次池：train 只查火車、bus 只查公車、any 兩者合併 */
export function findTripsForMode(originKey: string, destKey: string, dayType: DayType, mode: TransportMode): ModedTrip[] {
  if (mode === "train") return findTrainTrips(originKey, destKey);
  if (mode === "bus") return findBusTrips(originKey, destKey, dayType);
  if (mode === "any") {
    return [...findBusTrips(originKey, destKey, dayType), ...findTrainTrips(originKey, destKey)].sort(
      (a, b) => a.departMinutes - b.departMinutes
    );
  }
  return []; // drive / taxi 沒有時刻表資料，交給呼叫端另外處理，不會走到這裡的班次查詢
}
