// 多輪對話的結構化行程狀態。整個狀態存在瀏覽器 sessionStorage（見 TransitAssistantWidget.tsx），
// 伺服器本身完全不保存任何一輪的對話狀態 —— Vercel Serverless 無法保證下一次請求會落在
// 同一台伺服器上，所以每次請求都是「無狀態」的：瀏覽器把目前的 conversationState 隨請求送來，
// 伺服器驗證後拿來理解語意、計算完再回傳「更新後的 conversationState」讓瀏覽器繼續保存。

import type { Lang } from "../i18n";
import type { TimePeriod } from "./taipei-time";
import { isValidDateISO, isValidTimeHHMM, isValidTimePeriod } from "./taipei-time";
import { resolveLocationText } from "./locations";
import { isValidTransportMode, type TransportMode, type ScheduledMode } from "./transport";
import type { ParsedQuery } from "./openai-parser";
import { ROUTES } from "../bus-data";
import { LOCAL_ROUTES } from "../local-bus-data";

export interface RouteSegment {
  mode: ScheduledMode;
  fromKey: string;
  toKey: string;
  routeLabel: string;
  departTime: string;
  arriveTime: string | null;
  fareFull: number | null;
  fareHalf: number | null;
}

/** 目前還缺、正在等旅客補上的欄位；補齊後立刻設回 null，不會一直卡著重複問 */
export type PendingClarification = "requestedTime" | "requestedDate" | "origin" | "destination" | "transportMode" | null;

const VALID_PENDING_CLARIFICATIONS: PendingClarification[] = ["requestedTime", "requestedDate", "origin", "destination", "transportMode"];

export function isValidPendingClarification(v: unknown): v is PendingClarification {
  return v === null || (typeof v === "string" && (VALID_PENDING_CLARIFICATIONS as string[]).includes(v));
}

export interface ConversationState {
  requestedDate: string | null;
  requestedTime: string | null;
  timePeriod: TimePeriod | null;
  origin: string | null;
  waypoints: string[];
  destination: string | null;
  currentLocation: string | null;
  /** 旅客上一輪指定的交通工具；沒指定過就是 null（等同 any） */
  transportMode: TransportMode | null;
  lastArrivalTime: string | null;
  lastDepartureTime: string | null;
  lastRouteSegments: RouteSegment[];
  language: Lang;
  pendingClarification: PendingClarification;
  /** 上一輪是否問了旅客「要不要提供包車司機聯絡方式」，還在等是/否回答 */
  awaitingDriverOfferResponse: boolean;
}

export const EMPTY_CONVERSATION_STATE: ConversationState = {
  requestedDate: null,
  requestedTime: null,
  timePeriod: null,
  origin: null,
  waypoints: [],
  destination: null,
  currentLocation: null,
  transportMode: null,
  lastArrivalTime: null,
  lastDepartureTime: null,
  lastRouteSegments: [],
  language: "zh",
  pendingClarification: null,
  awaitingDriverOfferResponse: false,
};

const MAX_WAYPOINTS = 5;
const MAX_SEGMENTS = 6;
const MAX_PLACE_LEN = 60;
const MAX_LABEL_LEN = 60;
const VALID_LANGS = ["zh", "zh-CN", "en"];

// 用來驗證前端傳來的「上一輪路線」路線代碼是否真實存在，避免接受偽造的班次資訊
const KNOWN_ROUTE_LABELS = new Set<string>([
  ...ROUTES.map((r) => r.shortLabel),
  ...ROUTES.map((r) => r.label),
  ...LOCAL_ROUTES.map((l) => l.label),
]);

function sanitizePlace(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim().slice(0, MAX_PLACE_LEN);
  if (!trimmed) return null;
  // 只信任「確實存在於地點清單」的地名，不相信前端亂傳的任意字串
  return resolveLocationText(trimmed) ? trimmed : null;
}

// 只有這兩種真的有時刻表的交通方式，路線代碼才需要對照公車路線清單；火車班次代碼另外對照
const KNOWN_TRAIN_ROUTE_LABELS = new Set<string>(["阿里山號 1次", "阿里山號 2次", "阿里山號 5次", "阿里山號 8次"]);

function sanitizeSegment(v: unknown): RouteSegment | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const mode = o.mode === "bus" || o.mode === "train" ? (o.mode as ScheduledMode) : null;
  const fromKey = sanitizePlace(o.fromKey);
  const toKey = sanitizePlace(o.toKey);
  const routeLabel = typeof o.routeLabel === "string" ? o.routeLabel.slice(0, MAX_LABEL_LEN) : null;
  const departTime = isValidTimeHHMM(o.departTime) ? o.departTime : null;
  const arriveTime = isValidTimeHHMM(o.arriveTime) ? o.arriveTime : null;
  const fareFull = typeof o.fareFull === "number" && Number.isFinite(o.fareFull) ? o.fareFull : null;
  const fareHalf = typeof o.fareHalf === "number" && Number.isFinite(o.fareHalf) ? o.fareHalf : null;

  if (!mode || !fromKey || !toKey || !routeLabel || !departTime) return null;
  const knownLabel = mode === "bus" ? KNOWN_ROUTE_LABELS.has(routeLabel) : KNOWN_TRAIN_ROUTE_LABELS.has(routeLabel);
  if (!knownLabel) return null;
  return { mode, fromKey, toKey, routeLabel, departTime, arriveTime, fareFull, fareHalf };
}

/**
 * 把瀏覽器送來的 conversationState 重新驗證一遍，絕不直接信任前端內容：
 * 日期/時間格式、地點是否存在於地點清單、路線代碼是否存在、字串長度、waypoints 數量都會檢查。
 * 任何格式不對或無法驗證的欄位一律拿掉（變成 null / 空陣列），不會讓整個請求失敗 ——
 * 這份狀態終究只是「輔助理解語意的上下文提示」，真正的班次事實一律由伺服器現有資料重新計算，
 * 絕不會直接採用前端提供的班次、票價或抵達時間做為計算依據。
 */
export function sanitizeConversationState(raw: unknown): ConversationState {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_CONVERSATION_STATE };
  const o = raw as Record<string, unknown>;

  const waypointsRaw = Array.isArray(o.waypoints) ? o.waypoints.slice(0, MAX_WAYPOINTS) : [];
  const waypoints = waypointsRaw.map(sanitizePlace).filter((w): w is string => w !== null);

  const segmentsRaw = Array.isArray(o.lastRouteSegments) ? o.lastRouteSegments.slice(0, MAX_SEGMENTS) : [];
  const lastRouteSegments = segmentsRaw.map(sanitizeSegment).filter((s): s is RouteSegment => s !== null);

  return {
    requestedDate: isValidDateISO(o.requestedDate) ? o.requestedDate : null,
    requestedTime: isValidTimeHHMM(o.requestedTime) ? o.requestedTime : null,
    timePeriod: isValidTimePeriod(o.timePeriod) ? o.timePeriod : null,
    origin: sanitizePlace(o.origin),
    waypoints,
    destination: sanitizePlace(o.destination),
    currentLocation: sanitizePlace(o.currentLocation),
    transportMode: isValidTransportMode(o.transportMode) ? o.transportMode : null,
    lastArrivalTime: isValidTimeHHMM(o.lastArrivalTime) ? o.lastArrivalTime : null,
    lastDepartureTime: isValidTimeHHMM(o.lastDepartureTime) ? o.lastDepartureTime : null,
    lastRouteSegments,
    language: typeof o.language === "string" && VALID_LANGS.includes(o.language) ? (o.language as Lang) : "zh",
    pendingClarification: isValidPendingClarification(o.pendingClarification) ? o.pendingClarification : null,
    awaitingDriverOfferResponse: o.awaitingDriverOfferResponse === true,
  };
}

/**
 * 把驗證過的狀態壓縮成一段精簡 JSON 交給 OpenAI 當上下文（不是整段聊天紀錄），
 * 只留下「理解這句話語意」會用到的欄位，藉此把費用壓在最低。沒有任何有意義的上下文時回傳 null，
 * 讓呼叫端可以完全略過這段內容。
 */
export function buildContextForAI(state: ConversationState): string | null {
  const hasContext =
    state.origin ||
    state.destination ||
    state.waypoints.length > 0 ||
    state.currentLocation ||
    state.requestedDate ||
    state.awaitingDriverOfferResponse;
  if (!hasContext) return null;
  return JSON.stringify({
    requestedDate: state.requestedDate,
    requestedTime: state.requestedTime,
    timePeriod: state.timePeriod,
    origin: state.origin,
    waypoints: state.waypoints,
    destination: state.destination,
    currentLocation: state.currentLocation,
    transportMode: state.transportMode,
    lastDepartureTime: state.lastDepartureTime,
    lastArrivalTime: state.lastArrivalTime,
    pendingClarification: state.pendingClarification,
    awaitingDriverOfferResponse: state.awaitingDriverOfferResponse,
  });
}

/**
 * 通用合併規則：只有「真正有值」的欄位才會蓋掉舊值，null／undefined／空字串一律忽略，
 * 沿用 previous 裡原本的值。這是唯一允許「清空」某個欄位的方式：呼叫端必須先自己決定好
 * 「這個欄位這一輪真的要蓋成什麼」，而不是讓 AI 隨口沒提到的欄位意外把舊資料洗掉。
 */
export function mergeConversationState(
  previous: ConversationState,
  updates: Partial<ConversationState>
): ConversationState {
  const cleaned: Partial<ConversationState> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== null && value !== undefined && value !== "") {
      (cleaned as Record<string, unknown>)[key] = value;
    }
  }
  return { ...previous, ...cleaned };
}

export interface MergedFields {
  requestedDate: string | null;
  requestedTime: string | null;
  timePeriod: TimePeriod | null;
  originText: string | null;
  waypointTexts: string[];
  destText: string | null;
  transportMode: TransportMode;
}

/**
 * 核心合併規則（單一來源，merge.ts 的查詢流程和這裡的狀態持久化都靠這個）：
 * 1. 新訊息明確提供的資料優先；沒提供的才沿用 conversationState。
 * 2. 時間／時段互斥成對處理：這輪只要給了「確切時間」「時段」「晚一班」任一個，就以這輪為準
 *    （可能刻意清空另一個）；三個都沒給，才整組沿用舊的，不會用舊的確切時間蓋掉這輪新給的時段。
 * 3. waypoints：沒有明確清除信號、新訊息也沒給新的中途點時，沿用舊的，不會被預設的空陣列洗掉；
 *    只有旅客明確講「不去X了／取消中途站／直接去民宿」（clearWaypoints）才會清空。
 * 4. transportMode="any" 代表這輪沒有偵測到明確交通工具，才沿用上一輪指定過的工具。
 */
export function mergeConversationFields(parsed: ParsedQuery, state: ConversationState): MergedFields {
  const originText = parsed.origin || state.origin;
  const destText = parsed.destination || state.destination;

  const waypointTexts = parsed.clearWaypoints
    ? []
    : Array.isArray(parsed.waypoints) && parsed.waypoints.length > 0
      ? parsed.waypoints
      : state.waypoints;

  const requestedDate = isValidDateISO(parsed.date) ? parsed.date : state.requestedDate;

  const timeGivenThisTurn =
    isValidTimeHHMM(parsed.departureTime) || isValidTimePeriod(parsed.timePeriod) || parsed.excludePreviousRecommendation;
  const requestedTime = timeGivenThisTurn ? (isValidTimeHHMM(parsed.departureTime) ? parsed.departureTime : null) : state.requestedTime;
  const timePeriod = timeGivenThisTurn ? (isValidTimePeriod(parsed.timePeriod) ? parsed.timePeriod : null) : state.timePeriod;

  const transportMode: TransportMode =
    parsed.transportMode && parsed.transportMode !== "any" ? parsed.transportMode : (state.transportMode ?? "any");

  return { requestedDate, requestedTime, timePeriod, originText, waypointTexts, destText, transportMode };
}

/**
 * 把這一輪的合併結果組成完整的 ConversationState，用來保存／回傳給瀏覽器。
 * 不管這一輪最後是成功算出行程、還是卡在澄清問題，都要呼叫這個函式 —— 這樣「已經問出來的
 * 出發地、目的地、日期、交通工具」才不會因為這輪只補了一個時間，就被整個清空重問一次。
 * currentLocation／lastArrivalTime／lastDepartureTime／lastRouteSegments 不在這裡處理，
 * 那些只有在真的成功算出一班車之後才更新（由呼叫端另外疊加）。
 */
export function buildUpdatedConversationState(parsed: ParsedQuery, state: ConversationState, lang: Lang): ConversationState {
  const fields = mergeConversationFields(parsed, state);
  const originKey = fields.originText ? (resolveLocationText(fields.originText)?.key ?? state.origin) : state.origin;
  const destKey = fields.destText ? (resolveLocationText(fields.destText)?.key ?? state.destination) : state.destination;
  const waypointKeys = fields.waypointTexts.map((w) => resolveLocationText(w)?.key).filter((k): k is string => Boolean(k));

  return {
    requestedDate: fields.requestedDate,
    requestedTime: fields.requestedTime,
    timePeriod: fields.timePeriod,
    origin: originKey,
    waypoints: waypointKeys,
    destination: destKey,
    transportMode: fields.transportMode,
    currentLocation: state.currentLocation,
    lastArrivalTime: state.lastArrivalTime,
    lastDepartureTime: state.lastDepartureTime,
    lastRouteSegments: state.lastRouteSegments,
    language: lang,
    pendingClarification: parsed.needsClarification ? parsed.clarificationField : null,
    // 這裡先預設關閉；真的查到「完全沒有班次」時，由 route.ts 在回傳前另外疊加成 true
    awaitingDriverOfferResponse: false,
  };
}

export interface MergeDebugInfo {
  kept: string[];
  updated: string[];
  ignoredNull: string[];
}

/** 開發模式用：這輪合併之後，哪些欄位維持原狀、哪些被更新、哪些是因為這輪給了 null 而被忽略 */
export function buildMergeDebugInfo(parsed: ParsedQuery, previous: ConversationState, merged: ConversationState): MergeDebugInfo {
  const fieldKeys: (keyof ConversationState)[] = ["requestedDate", "requestedTime", "timePeriod", "origin", "waypoints", "destination", "transportMode"];
  const rawByField: Partial<Record<keyof ConversationState, unknown>> = {
    requestedDate: parsed.date,
    requestedTime: parsed.departureTime,
    timePeriod: parsed.timePeriod,
    origin: parsed.origin,
    waypoints: parsed.waypoints,
    destination: parsed.destination,
    transportMode: parsed.transportMode === "any" ? null : parsed.transportMode,
  };

  const kept: string[] = [];
  const updated: string[] = [];
  const ignoredNull: string[] = [];

  for (const f of fieldKeys) {
    const same = JSON.stringify(previous[f]) === JSON.stringify(merged[f]);
    if (same) {
      kept.push(f);
    } else {
      updated.push(f);
    }
    const raw = rawByField[f];
    const rawIsEmpty = raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0 && !parsed.clearWaypoints);
    if (same && rawIsEmpty) ignoredNull.push(f);
  }

  return { kept, updated, ignoredNull };
}
