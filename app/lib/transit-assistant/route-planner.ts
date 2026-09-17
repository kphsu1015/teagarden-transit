// 班次計算引擎：純 TypeScript，完全不呼叫 OpenAI。
// 資料來源一律重用 app/lib/schedule-utils.ts（公車）與 app/lib/rail-data.ts（森林鐵路），
// 經 transport.ts 依 transportMode 分流查詢，不建立第二份班次資料，也不修改既有交通資料的內容。
// mode 一律由資料來源決定（bus-data/local-bus-data -> bus，rail-data -> train），
// 絕不用路線名稱或文字內容猜交通方式。

import { dayTypeOf, minutesToTime, timeToMinutes as scheduleTimeToMinutes } from "../schedule-utils";
import { HOMESTAY_STOP } from "../bus-data";
import { getTaipeiNow, taipeiToEpochMs, taipeiToIsoString, TIME_PERIOD_RANGES, TimePeriod } from "./taipei-time";
import {
  findTripsForMode,
  findBusTrips,
  findTrainTrips,
  TransportMode,
  ScheduledMode,
  ModedTrip,
} from "./transport";

export type PlanStatus =
  | "ok"
  | "missed_last"
  | "no_route"
  | "same_place"
  | "outside_period"
  | "mode_unavailable_offer_alternative"
  | "no_schedule_mode";

/**
 * 一段查詢的搜尋時間窗，一律用絕對時間點（epoch ms）表示，不是當天分鐘數。
 * 這樣「今天」和「未來日期」的班次才不會被誤用「現在的 HH:mm」互相比較。
 * upperEpochMs 為 null 代表沒有上限（從 lowerEpochMs 開始，當天剩下的班次都算）；
 * 有值時代表限定在一個時段內（例如「明天早上」只看 06:00～12:00）。
 */
export interface SearchWindow {
  lowerEpochMs: number;
  upperEpochMs: number | null;
}

function pointWindow(dateISO: string, hhmm: string): SearchWindow {
  return { lowerEpochMs: taipeiToEpochMs(dateISO, hhmm), upperEpochMs: null };
}

/**
 * 依「使用者指定的確切時間」>「使用者指定的時段」>「查詢日期是不是今天」的優先順序，
 * 決定這次查詢要用的搜尋時間窗。這是唯一允許用到「現在台灣時間」的地方 —— 而且只有在
 * 查詢日期真的是今天時才會用「現在」；未來日期完全沒有指定時間/時段時，就顯示當天全部班次，
 * 絕不會誤用今天的現在時分去過濾未來日期的班次。
 */
export function resolveSearchWindow(
  dateISO: string,
  requestedTimeHHMM: string | null | undefined,
  timePeriod: TimePeriod | null | undefined
): SearchWindow {
  if (requestedTimeHHMM) {
    return pointWindow(dateISO, requestedTimeHHMM);
  }
  if (timePeriod && TIME_PERIOD_RANGES[timePeriod]) {
    const { start, end } = TIME_PERIOD_RANGES[timePeriod];
    return { lowerEpochMs: taipeiToEpochMs(dateISO, start), upperEpochMs: taipeiToEpochMs(dateISO, end) };
  }
  const now = getTaipeiNow();
  if (dateISO === now.dateISO) {
    // 今天，沒有指定時間/時段：用現在的台灣時間當下限，只顯示還沒發車的班次
    return pointWindow(dateISO, now.timeHHMM);
  }
  // 未來（或過去）日期，完全沒指定時間/時段：不可套用「現在」，顯示當天全部班次
  return pointWindow(dateISO, "00:00");
}

export interface DebugTripEntry {
  mode: ScheduledMode;
  routeLabel: string;
  departTime: string;
  departureDateTime: string; // 2026-09-17T09:00:00+08:00
  included: boolean;
  reason?: string;
}

export interface PlanTripArgs {
  originKey: string;
  destKey: string;
  dateISO: string;
  window: SearchWindow;
  /** 指定要查哪種交通方式；train 只查森林鐵路、bus 只查公車、any 兩者合併，drive/taxi 沒有時刻表資料 */
  transportMode: TransportMode;
  /** 開發模式才需要打開，會列出每一班「有算過但被排除」的原因 */
  includeDebugTrace?: boolean;
}

export interface PlanResult {
  status: PlanStatus;
  requestedMode: TransportMode;
  originKey: string;
  destKey: string;
  dateISO: string;
  window: SearchWindow;
  isToday: boolean;
  nextTrip: ModedTrip | null;
  waitMinutes: number | null; // 只有 isToday 才有意義
  moreTrips: ModedTrip[]; // nextTrip 之後，同一天再多幾班（時段查詢時，會限制在同一個時段內）
  totalMatchingTrips: number;
  arrivesAtHomestayStop: boolean;
  departsFromHomestayStop: boolean;
  /** status 為 mode_unavailable_offer_alternative 時：指定交通方式當天最接近查詢時間的班次（不受時間窗限制），最多兩筆 */
  closestModeTrips: ModedTrip[];
  /** status 為 mode_unavailable_offer_alternative 時：確實有資料可用、可以詢問旅客要不要改搭的另一種交通方式 */
  alternativeMode: ScheduledMode | null;
  /** 這個交通方式當天（不受搜尋時間窗限制）的最後一班車；查得到路線資料時一律附上，方便回覆時提醒旅客末班車時間 */
  lastTripOfDay: ModedTrip | null;
  debugTrace?: DebugTripEntry[];
}

interface WindowEvalResult {
  status: "no_route" | "missed_last" | "outside_period" | "ok";
  nextTrip: ModedTrip | null;
  waitMinutes: number | null;
  moreTrips: ModedTrip[];
  totalMatchingTrips: number;
  debugTrace?: DebugTripEntry[];
}

/** 把一組候選班次和搜尋時間窗比對，換算成完整的絕對時間點再比較，不是只拿 HH:mm 比大小 */
function evaluateAgainstWindow(
  allTrips: ModedTrip[],
  dateISO: string,
  window: SearchWindow,
  isToday: boolean,
  includeDebugTrace: boolean | undefined
): WindowEvalResult {
  if (allTrips.length === 0) {
    return { status: "no_route", nextTrip: null, waitMinutes: null, moreTrips: [], totalMatchingTrips: 0 };
  }

  const withEpoch = allTrips.map((t) => ({ trip: t, epochMs: taipeiToEpochMs(dateISO, t.departTime) }));
  const isIncluded = (epochMs: number) =>
    epochMs >= window.lowerEpochMs && (window.upperEpochMs === null || epochMs <= window.upperEpochMs);
  const included = withEpoch.filter(({ epochMs }) => isIncluded(epochMs));

  let debugTrace: DebugTripEntry[] | undefined;
  if (includeDebugTrace) {
    debugTrace = withEpoch.map(({ trip, epochMs }) => {
      const inc = isIncluded(epochMs);
      return {
        mode: trip.mode,
        routeLabel: trip.routeLabel,
        departTime: trip.departTime,
        departureDateTime: taipeiToIsoString(dateISO, trip.departTime),
        included: inc,
        reason: inc ? undefined : epochMs < window.lowerEpochMs ? "早於查詢下限（已發車或早於指定時間/時段）" : "晚於查詢時段上限",
      };
    });
  }

  if (included.length === 0) {
    return {
      status: window.upperEpochMs !== null ? "outside_period" : "missed_last",
      nextTrip: null,
      waitMinutes: null,
      moreTrips: [],
      totalMatchingTrips: allTrips.length,
      debugTrace,
    };
  }

  const sorted = included.sort((a, b) => a.epochMs - b.epochMs).map((x) => x.trip);
  const nextTrip = sorted[0];
  const now = getTaipeiNow();
  const nowEpochMs = taipeiToEpochMs(now.dateISO, now.timeHHMM);
  const nextTripEpochMs = taipeiToEpochMs(dateISO, nextTrip.departTime);

  return {
    status: "ok",
    nextTrip,
    waitMinutes: isToday ? Math.round((nextTripEpochMs - nowEpochMs) / 60000) : null,
    moreTrips: sorted.slice(1, 4),
    totalMatchingTrips: allTrips.length,
    debugTrace,
  };
}

function emptyResult(status: PlanStatus, args: PlanTripArgs, isToday: boolean): PlanResult {
  return {
    status,
    requestedMode: args.transportMode,
    originKey: args.originKey,
    destKey: args.destKey,
    dateISO: args.dateISO,
    window: args.window,
    isToday,
    nextTrip: null,
    waitMinutes: null,
    moreTrips: [],
    totalMatchingTrips: 0,
    arrivesAtHomestayStop: args.destKey === HOMESTAY_STOP,
    departsFromHomestayStop: args.originKey === HOMESTAY_STOP,
    closestModeTrips: [],
    alternativeMode: null,
    lastTripOfDay: null,
  };
}

function findLastTripOfDay(trips: ModedTrip[]): ModedTrip | null {
  if (trips.length === 0) return null;
  return trips.reduce((latest, t) => (t.departMinutes > latest.departMinutes ? t : latest));
}

export function planTrip(args: PlanTripArgs): PlanResult {
  const { originKey, destKey, dateISO, window, transportMode, includeDebugTrace } = args;
  const now = getTaipeiNow();
  const isToday = dateISO === now.dateISO;

  if (originKey === destKey) {
    return emptyResult("same_place", args, isToday);
  }

  // 自行開車／包車計程車沒有時刻表資料，不查班次，交給 answer-builder 產生資訊性回覆
  if (transportMode === "drive" || transportMode === "taxi") {
    return emptyResult("no_schedule_mode", args, isToday);
  }

  const dayType = dayTypeOf(dateISO);
  const primaryTrips = findTripsForMode(originKey, destKey, dayType, transportMode);
  const evalResult = evaluateAgainstWindow(primaryTrips, dateISO, window, isToday, includeDebugTrace);
  const lastTripOfDay = findLastTripOfDay(primaryTrips);

  const baseFields = {
    requestedMode: transportMode,
    originKey,
    destKey,
    dateISO,
    window,
    isToday,
    arrivesAtHomestayStop: destKey === HOMESTAY_STOP,
    departsFromHomestayStop: originKey === HOMESTAY_STOP,
    lastTripOfDay,
  };

  // 森林鐵路一天只有兩班，「指定時間」查到的下一班如果離查詢時間很遠（超過一小時），
  // 不能直接當成「就是這班」默默推薦掉 —— 要老實說這個時間沒有火車，改列出最接近的班次讓旅客決定，
  // 絕不能因為技術上「有找到一班更晚的」就當作滿足了旅客要求的時間。公車班次密集，不套用這個規則。
  const TRAIN_GAP_TOLERANCE_MS = 60 * 60 * 1000;
  if (
    evalResult.status === "ok" &&
    transportMode === "train" &&
    window.upperEpochMs === null &&
    taipeiToEpochMs(dateISO, evalResult.nextTrip!.departTime) - window.lowerEpochMs > TRAIN_GAP_TOLERANCE_MS
  ) {
    const otherTrips = findBusTrips(originKey, destKey, dayType);
    return {
      ...baseFields,
      status: "mode_unavailable_offer_alternative",
      nextTrip: null,
      waitMinutes: null,
      moreTrips: [],
      totalMatchingTrips: evalResult.totalMatchingTrips,
      closestModeTrips: [evalResult.nextTrip!, ...evalResult.moreTrips].slice(0, 2),
      alternativeMode: otherTrips.length > 0 ? "bus" : null,
      debugTrace: evalResult.debugTrace,
    };
  }

  if (evalResult.status === "ok") {
    return {
      ...baseFields,
      status: "ok",
      nextTrip: evalResult.nextTrip,
      waitMinutes: evalResult.waitMinutes,
      moreTrips: evalResult.moreTrips,
      totalMatchingTrips: evalResult.totalMatchingTrips,
      closestModeTrips: [],
      alternativeMode: null,
      debugTrace: evalResult.debugTrace,
    };
  }

  // 指定的是單一交通方式（train 或 bus）而且沒查到符合的班次：看看另一種交通方式是不是真的有資料可用，
  // 有的話就不要直接放棄或偷偷換掉，而是準備「最接近的原本交通方式班次 + 可詢問的替代方式」讓上層決定怎麼問旅客
  if (transportMode === "train" || transportMode === "bus") {
    const otherMode: ScheduledMode = transportMode === "train" ? "bus" : "train";
    const otherTrips = otherMode === "bus" ? findBusTrips(originKey, destKey, dayType) : findTrainTrips(originKey, destKey);

    if (otherTrips.length > 0) {
      const closestModeTrips = [...primaryTrips]
        .sort(
          (a, b) =>
            Math.abs(taipeiToEpochMs(dateISO, a.departTime) - window.lowerEpochMs) -
            Math.abs(taipeiToEpochMs(dateISO, b.departTime) - window.lowerEpochMs)
        )
        .slice(0, 2)
        .sort((a, b) => a.departMinutes - b.departMinutes);

      return {
        ...baseFields,
        status: "mode_unavailable_offer_alternative",
        nextTrip: null,
        waitMinutes: null,
        moreTrips: [],
        totalMatchingTrips: evalResult.totalMatchingTrips,
        closestModeTrips,
        alternativeMode: otherMode,
        debugTrace: evalResult.debugTrace,
      };
    }
  }

  return {
    ...baseFields,
    status: evalResult.status,
    nextTrip: null,
    waitMinutes: null,
    moreTrips: [],
    totalMatchingTrips: evalResult.totalMatchingTrips,
    closestModeTrips: [],
    alternativeMode: null,
    debugTrace: evalResult.debugTrace,
  };
}

// 多段行程（有中途點）：轉乘緩衝時間，避免建議「一下車馬上接上下一班」這種不切實際的銜接
const TRANSFER_BUFFER_MINUTES = 5;

export interface LegPlan {
  fromKey: string;
  toKey: string;
  plan: PlanResult;
}

export interface MultiLegPlanResult {
  legs: LegPlan[];
  overallStatus: "ok" | "blocked";
  /** 第一個卡住的段落索引；overallStatus 為 ok 時是 null */
  blockedAtIndex: number | null;
}

/**
 * 依序規劃「起點 -> 中途點1 -> 中途點2 -> ... -> 終點」的多段行程。
 * 只有第一段會用呼叫端指定的交通方式（例如旅客明確要求「搭火車」）；後續每一段都不會再繼承
 * 這個限定 —— 轉乘之後用 any（公車與火車一起查、取較早的）找銜接得上的班次，因為旅客通常只在意
 * 「這一段」要怎麼搭，不代表全程都要同一種交通方式（森林鐵路本來就不到民宿）。
 * 每一段的搜尋時間窗：第一段用呼叫端給的（現在／指定時間／指定時段），第二段以後一律用「前一段
 * 實際算出的抵達時間 + 轉乘緩衝」當作精確的下一個時間點去查，不會、也不可以再套用現在時間或原始時段。
 * 只要有一段查無路線、末班車已過，或時段內沒有班次，就誠實停在那一段，不臆測後續行程。
 */
export function planMultiLegTrip(
  stopsInOrder: string[],
  dateISO: string,
  firstLegWindow: SearchWindow,
  firstLegMode: TransportMode = "bus",
  includeDebugTrace?: boolean
): MultiLegPlanResult {
  const legs: LegPlan[] = [];
  let window = firstLegWindow;
  let blockedAtIndex: number | null = null;

  for (let i = 0; i < stopsInOrder.length - 1; i++) {
    const fromKey = stopsInOrder[i];
    const toKey = stopsInOrder[i + 1];
    const transportMode: TransportMode = i === 0 ? firstLegMode : "any";
    const plan = planTrip({ originKey: fromKey, destKey: toKey, dateISO, window, transportMode, includeDebugTrace });
    legs.push({ fromKey, toKey, plan });

    if (plan.status !== "ok") {
      blockedAtIndex = i;
      break;
    }

    const arrivalAnchor = plan.nextTrip!.arriveTime ?? plan.nextTrip!.departTime;
    const bufferedTime = minutesToTime(scheduleTimeToMinutes(arrivalAnchor) + TRANSFER_BUFFER_MINUTES);
    // 下一段一律用「這一段實際抵達時間 + 緩衝」的精確時間點查詢，不是時段、也不是現在時間
    window = pointWindow(dateISO, bufferedTime);
  }

  return { legs, overallStatus: blockedAtIndex === null ? "ok" : "blocked", blockedAtIndex };
}

/**
 * 這一段是不是「真的完全查不到任何班次」—— no_route／missed_last／outside_period 本來就是；
 * mode_unavailable_offer_alternative 只有在連另一種交通方式都沒有資料時才算，因為那種情況下
 * 已經有另一個模式可以查，還不到要問包車司機的地步。用來判斷要不要主動問旅客要不要看包車司機聯絡方式。
 */
export function isNoServiceStatus(plan: PlanResult): boolean {
  if (plan.status === "no_route" || plan.status === "missed_last" || plan.status === "outside_period") return true;
  if (plan.status === "mode_unavailable_offer_alternative" && plan.alternativeMode === null) return true;
  return false;
}
