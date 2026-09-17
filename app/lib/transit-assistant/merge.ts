// 把「這一輪 AI 解析結果」和「上一輪 conversationState」合併成這次要查詢的實際條件。
// 實際的欄位合併規則統一由 conversation.ts 的 mergeConversationFields 處理（單一來源，
// 狀態持久化跟這裡的查詢流程才不會各自實作出不一致的合併邏輯），這裡只負責把合併後的
// 文字地點解析成真正的站點資料，並套用查詢才需要的商業規則（目的地預設回民宿、時間窗計算）。

import { resolveLocationText, type ResolvedLocation } from "./locations";
import { taipeiToEpochMs, type TaipeiNow, type TimePeriod } from "./taipei-time";
import { resolveSearchWindow, type SearchWindow } from "./route-planner";
import type { TransportMode } from "./transport";
import { HOMESTAY_STOP } from "../bus-data";
import { mergeConversationFields, type ConversationState } from "./conversation";
import type { ParsedQuery } from "./openai-parser";

export type MergeResult =
  | { kind: "need_origin" }
  | { kind: "need_destination" }
  | { kind: "unknown_place"; field: "origin" | "destination" | "waypoint" }
  | {
      kind: "resolved";
      origin: ResolvedLocation;
      waypoints: ResolvedLocation[];
      dest: ResolvedLocation;
      dateISO: string;
      requestedTime: string | null;
      timePeriod: TimePeriod | null;
      window: SearchWindow;
      transportMode: TransportMode;
      mentionedLongtouping: boolean;
    };

/**
 * 合併規則（對應交通小幫手多輪對話需求，實際欄位合併見 conversation.ts 的 mergeConversationFields）：
 * 1. 新訊息明確提供的資料優先，沒提供的才沿用 conversationState；null/undefined/空字串不會覆蓋舊值。
 * 2. 時間/時段：只有這句話完全沒提到時間時，才整組沿用上一輪，避免舊的確切時間蓋掉這一輪新給的時段（或反過來）。
 * 3.「晚一班」等說法（excludePreviousRecommendation）：下限一定要晚於上一輪實際推薦的那一班。
 * 4. 交通工具：AI 這輪沒有偵測到明確交通工具時（transportMode="any"）才沿用上一輪指定的工具。
 * 5. waypoints：沒有明確清除信號、這輪也沒給新的中途點時，沿用舊的，不會被預設的空陣列洗掉。
 */
export function mergeConversationTurn(parsed: ParsedQuery, state: ConversationState, now: TaipeiNow): MergeResult {
  const fields = mergeConversationFields(parsed, state);

  const origin = fields.originText ? resolveLocationText(fields.originText) : null;
  if (!origin) return fields.originText ? { kind: "unknown_place", field: "origin" } : { kind: "need_origin" };

  let destText = fields.destText;
  if (!destText) {
    if (origin.key === HOMESTAY_STOP) return { kind: "need_destination" };
    destText = HOMESTAY_STOP;
  }
  const dest = resolveLocationText(destText);
  if (!dest) return { kind: "unknown_place", field: "destination" };

  const waypoints: ResolvedLocation[] = [];
  for (const w of fields.waypointTexts) {
    const resolved = resolveLocationText(w);
    if (!resolved) return { kind: "unknown_place", field: "waypoint" };
    waypoints.push(resolved);
  }

  const dateISO = fields.requestedDate ?? now.dateISO;

  let window = resolveSearchWindow(dateISO, fields.requestedTime, fields.timePeriod);
  if (parsed.excludePreviousRecommendation && state.lastDepartureTime) {
    const afterPrev = taipeiToEpochMs(dateISO, state.lastDepartureTime) + 60_000;
    window = { lowerEpochMs: Math.max(window.lowerEpochMs, afterPrev), upperEpochMs: window.upperEpochMs };
  }

  return {
    kind: "resolved",
    origin,
    waypoints,
    dest,
    dateISO,
    requestedTime: fields.requestedTime,
    timePeriod: fields.timePeriod,
    window,
    transportMode: fields.transportMode,
    mentionedLongtouping:
      origin.mentionedLongtouping || dest.mentionedLongtouping || waypoints.some((w) => w.mentionedLongtouping),
  };
}
