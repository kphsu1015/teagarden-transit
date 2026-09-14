import { RouteData, BusRoute, ROUTES, ROUTE_B } from "./bus-data";
import { LOCAL_ROUTES } from "./local-bus-data";

export interface Trip {
  direction: "outbound" | "inbound";
  departTime: string;
  arriveTime: string;
  fareFull: number | null;
  fareHalf: number | null;
  departMinutes: number;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function minutesToNowLabel(diffMin: number): string {
  if (diffMin < 0) return "已發車";
  if (diffMin === 0) return "現在發車";
  if (diffMin < 60) return `${diffMin} 分鐘後發車`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m === 0 ? `${h} 小時後發車` : `${h} 小時 ${m} 分鐘後發車`;
}

/** 站名 -> 距起點站累計票價陣列索引（以 route.outbound.stops 順序為準） */
function fareIndexMap(route: RouteData): Record<string, number> {
  const map: Record<string, number> = {};
  route.outbound.stops.forEach((name, i) => {
    map[name] = i;
  });
  return map;
}

function computeFare(route: RouteData, originName: string, destName: string) {
  const idx = fareIndexMap(route);
  const oi = idx[originName];
  const di = idx[destName];
  if (oi === undefined || di === undefined) {
    return { full: null, half: null };
  }
  return {
    full: Math.abs(route.fareFull[di] - route.fareFull[oi]),
    half: Math.abs(route.fareHalf[di] - route.fareHalf[oi]),
  };
}

/** 在一組「站名陣列 + 逐班次時刻陣列」中找出兩站之間的時刻（不含票價） */
function timesForStops(
  stops: string[],
  runsTimes: (string | null)[][],
  originName: string,
  destName: string
): { departTime: string; arriveTime: string; departMinutes: number }[] {
  const oi = stops.indexOf(originName);
  const di = stops.indexOf(destName);
  if (oi === -1 || di === -1 || oi >= di) return [];

  const out: { departTime: string; arriveTime: string; departMinutes: number }[] = [];
  for (const times of runsTimes) {
    const dep = times[oi];
    const arr = times[di];
    if (!dep || !arr) continue;
    out.push({ departTime: dep, arriveTime: arr, departMinutes: timeToMinutes(dep) });
  }
  return out.sort((a, b) => a.departMinutes - b.departMinutes);
}

function tripsForDirection(
  route: RouteData,
  direction: "outbound" | "inbound",
  originName: string,
  destName: string
): Trip[] {
  const dir = route[direction];
  const fare = computeFare(route, originName, destName);
  return timesForStops(
    dir.stops,
    dir.runs.map((r) => r.times),
    originName,
    destName
  ).map((t) => ({ ...t, direction, fareFull: fare.full, fareHalf: fare.half }));
}

/** 找出某路線兩站之間的所有班次（自動判斷去程或回程方向） */
export function findTrips(route: RouteData, originName: string, destName: string): Trip[] {
  const outbound = tripsForDirection(route, "outbound", originName, destName);
  if (outbound.length > 0) return outbound;
  return tripsForDirection(route, "inbound", originName, destName);
}

/** 依目前時間（分鐘）篩出「現在之後」的班次；若當天已無班次則回傳空陣列 */
export function upcomingTrips(trips: Trip[], nowMinutes: number): Trip[] {
  return trips.filter((t) => t.departMinutes >= nowMinutes);
}

export function routeAllStopNames(route: RouteData): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const s of route.outbound.stops) {
    if (!seen.has(s)) {
      seen.add(s);
      names.push(s);
    }
  }
  for (const s of route.inbound.stops) {
    if (!seen.has(s)) {
      seen.add(s);
      names.push(s);
    }
  }
  return names;
}

/** 合併 A/B 線與在地公車後的統一站名清單（依地理順序排列） */
export function unifiedStopNames(): string[] {
  const ordered = ["高鐵嘉義站", ...ROUTE_B.outbound.stops, "故宮南院", "達邦"];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const s of ordered) {
    if (!seen.has(s)) {
      seen.add(s);
      names.push(s);
    }
  }
  return names;
}

export interface UnifiedTrip {
  routeLabel: string;
  departTime: string;
  arriveTime: string | null;
  fareFull: number | null;
  fareHalf: number | null;
  departMinutes: number;
  note?: string;
  estimated?: boolean;
}

export type DayType = "weekday" | "weekend";

/** 由 YYYY-MM-DD 判斷平日／假日（僅以週六日判斷，未計入國定假日） */
export function dayTypeOf(isoDate: string): DayType {
  const day = new Date(`${isoDate}T00:00:00`).getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

/** 某班次的備註（如「上班日行駛」「假日行駛」）是否符合指定的平日／假日 */
function matchesDayType(note: string | undefined, dayType: DayType): boolean {
  if (!note) return true; // 未註記代表每日行駛
  if (note.includes("上班日")) return dayType === "weekday";
  if (note.includes("假日")) return dayType === "weekend";
  return true;
}

/** 計算某條 B 線方向中，每一站相對於錨點站（anchorName）的平均行車分鐘數（跨所有班次取平均） */
function averageOffsetsFromAnchor(
  direction: "outbound" | "inbound",
  anchorName: string
): Record<string, number> {
  const dir = ROUTE_B[direction];
  const anchorIdx = dir.stops.indexOf(anchorName);
  if (anchorIdx === -1) return {};

  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const run of dir.runs) {
    const anchorTime = run.times[anchorIdx];
    if (!anchorTime) continue;
    const anchorMin = timeToMinutes(anchorTime);
    dir.stops.forEach((stopName, i) => {
      const t = run.times[i];
      if (!t) return;
      const diff = timeToMinutes(t) - anchorMin;
      if (diff < 0) return;
      sums[stopName] = (sums[stopName] ?? 0) + diff;
      counts[stopName] = (counts[stopName] ?? 0) + 1;
    });
  }
  const result: Record<string, number> = {};
  for (const name of Object.keys(sums)) result[name] = Math.round(sums[name] / counts[name]);
  return result;
}

// 7302 奮起湖線與 B 線共用同一條路廊全程（大雅站～奮起湖），可用 B 線各站時間差換算整段路線
const OUTBOUND_OFFSETS_FROM_GATEWAY = averageOffsetsFromAnchor("outbound", "嘉義大雅站");
const INBOUND_OFFSETS_FROM_FENQIHU = averageOffsetsFromAnchor("inbound", "奮起湖");

// 民宿業者實際經驗提供：7314 達邦線從達邦發車後，約 20 分鐘可抵達石棹——從石棹起即與 B 線共用路廊直到大雅站
const DABANG_TO_SHIZHUO_MINUTES = 20;
const INBOUND_OFFSETS_FROM_SHIZHUO = averageOffsetsFromAnchor("inbound", "石棹");

function inboundOffsetsForRoute(destLabel: string): Record<string, number> {
  if (destLabel === "奮起湖") return INBOUND_OFFSETS_FROM_FENQIHU;
  if (destLabel === "達邦") {
    const shifted: Record<string, number> = {};
    for (const [name, min] of Object.entries(INBOUND_OFFSETS_FROM_SHIZHUO)) {
      shifted[name] = min + DABANG_TO_SHIZHUO_MINUTES;
    }
    return shifted;
  }
  return {};
}

// 7314 達邦線只在「嘉義大雅站～石棹」這段與 B 線共用道路，過了石棹便分道往達邦，換算僅適用於此範圍
const SHARED_CORRIDOR_END = "石棹";
const corridorEndIdx = ROUTE_B.outbound.stops.indexOf(SHARED_CORRIDOR_END);
const CORRIDOR_STOPS = new Set(ROUTE_B.outbound.stops.slice(0, corridorEndIdx + 1));

function offsetsForRoute(routeId: string, offsets: Record<string, number>): Record<string, number> {
  if (routeId !== "7314") return offsets;
  const filtered: Record<string, number> = {};
  for (const [name, min] of Object.entries(offsets)) {
    if (CORRIDOR_STOPS.has(name)) filtered[name] = min;
  }
  return filtered;
}

/** 用 B 線的站間時間差，幫在地公車（7302/7314）合成一份「估計逐站時刻表」 */
function buildEstimatedDirection(
  anchorName: string,
  trips: { time: string; note?: string }[],
  offsets: Record<string, number>
): { stops: string[]; runs: (string | null)[][] } {
  const stops = [anchorName, ...Object.keys(offsets).filter((s) => s !== anchorName)];
  const runs = trips.map((t) => {
    const base = timeToMinutes(t.time);
    return stops.map((s) => (s === anchorName ? t.time : minutesToTime(base + offsets[s])));
  });
  return { stops, runs };
}

/** 跨 A/B 線與在地公車（7302/7314）查詢兩站之間的所有班次；dayType 用來篩選 7314 達邦線的平日／假日限定班次 */
export function findUnifiedTrips(originName: string, destName: string, dayType: DayType = "weekday"): UnifiedTrip[] {
  const results: UnifiedTrip[] = [];

  for (const route of ROUTES) {
    for (const t of findTrips(route, originName, destName)) {
      results.push({
        routeLabel: route.shortLabel,
        departTime: t.departTime,
        arriveTime: t.arriveTime,
        fareFull: t.fareFull,
        fareHalf: t.fareHalf,
        departMinutes: t.departMinutes,
      });
    }
  }

  for (const lr of LOCAL_ROUTES) {
    const outboundOffsets = offsetsForRoute(lr.id, OUTBOUND_OFFSETS_FROM_GATEWAY);
    const inboundOffsets = inboundOffsetsForRoute(lr.destLabel);

    // 起站端出發：往遠端終點站，或往路廊內任一共用站（如龍頭站/龍頭坪站、吳鳳廟…），以 B 線站間時間差換算
    if (originName === lr.gatewayLabel) {
      for (const t of lr.toDest) {
        if (!matchesDayType(t.note, dayType)) continue;
        const departMinutes = timeToMinutes(t.time);
        const isFullTrip = destName === lr.destLabel;
        const offset = outboundOffsets[destName];
        if (!isFullTrip && offset == null) continue;
        results.push({
          routeLabel: lr.label,
          departTime: t.time,
          arriveTime: offset != null ? minutesToTime(departMinutes + offset) : null,
          fareFull: null,
          fareHalf: null,
          departMinutes,
          note: t.note,
          estimated: offset != null,
        });
      }
    }

    // 遠端終點站出發：往起站端，或往路廊內任一共用站
    if (originName === lr.destLabel) {
      for (const t of lr.toGateway) {
        if (!matchesDayType(t.note, dayType)) continue;
        const departMinutes = timeToMinutes(t.time);
        const isFullTrip = destName === lr.gatewayLabel;
        const offset = inboundOffsets[destName];
        if (!isFullTrip && offset == null) continue;
        results.push({
          routeLabel: lr.label,
          departTime: t.time,
          arriveTime: offset != null ? minutesToTime(departMinutes + offset) : null,
          fareFull: null,
          fareHalf: null,
          departMinutes,
          note: t.note,
          estimated: offset != null,
        });
      }
    }

    // 從路廊內其他共用站出發（非起站端、非遠端終點站本身）：換算通過時間
    if (originName !== lr.gatewayLabel && originName !== lr.destLabel && Object.keys(inboundOffsets).length > 0) {
      const dayFiltered = lr.toGateway.filter((t) => matchesDayType(t.note, dayType));
      const est = buildEstimatedDirection(lr.destLabel, dayFiltered, inboundOffsets);
      for (const t of timesForStops(est.stops, est.runs, originName, destName)) {
        results.push({
          routeLabel: lr.label,
          departTime: t.departTime,
          arriveTime: t.arriveTime,
          fareFull: null,
          fareHalf: null,
          departMinutes: t.departMinutes,
          estimated: true,
        });
      }
    }
    if (originName !== lr.gatewayLabel && originName !== lr.destLabel && Object.keys(outboundOffsets).length > 0) {
      const dayFiltered = lr.toDest.filter((t) => matchesDayType(t.note, dayType));
      const est = buildEstimatedDirection(lr.gatewayLabel, dayFiltered, outboundOffsets);
      for (const t of timesForStops(est.stops, est.runs, originName, destName)) {
        results.push({
          routeLabel: lr.label,
          departTime: t.departTime,
          arriveTime: t.arriveTime,
          fareFull: null,
          fareHalf: null,
          departMinutes: t.departMinutes,
          estimated: true,
        });
      }
    }
  }

  return results.sort((a, b) => a.departMinutes - b.departMinutes);
}

export type { RouteData, BusRoute };
