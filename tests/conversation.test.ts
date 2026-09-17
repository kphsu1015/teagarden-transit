// 多輪對話功能的自動測試：conversationState 的安全驗證，以及「這一輪 AI 解析結果 + 上一輪狀態」
// 的合併規則。不呼叫真正的 OpenAI —— 每個情境都用「假設 AI 已經正確解析出的 ParsedQuery」直接
// 餵給合併邏輯，驗證問題出在合併/驗證層還是班次計算層都會被這裡的測試抓到。
// 跑法：npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeConversationState, EMPTY_CONVERSATION_STATE, type ConversationState } from "../app/lib/transit-assistant/conversation";
import { mergeConversationTurn } from "../app/lib/transit-assistant/merge";
import { planTrip } from "../app/lib/transit-assistant/route-planner";
import type { ParsedQuery } from "../app/lib/transit-assistant/openai-parser";
import { getTaipeiNow, taipeiToEpochMs, type TaipeiNow } from "../app/lib/transit-assistant/taipei-time";
import { HOMESTAY_STOP } from "../app/lib/bus-data";

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

// 固定用「離真正的今天有幾天距離」的日期，而不是寫死的日期字串 —— resolveSearchWindow 內部會用真正的
// getTaipeiNow() 判斷「這個日期是不是今天」，寫死日期字串萬一剛好撞上真正的今天，會誤用實際現在的時分，
// 讓測試結果隨著執行時間變動而不穩定。
const FIXED_WEEKDAY_DATE = addDaysISO(getTaipeiNow().dateISO, 3);
const FIXED_NOW: TaipeiNow = { dateISO: FIXED_WEEKDAY_DATE, timeHHMM: "08:00", minutes: 480 };

function baseParsed(overrides: Partial<ParsedQuery> = {}): ParsedQuery {
  return {
    language: "zh",
    origin: null,
    waypoints: [],
    clearWaypoints: false,
    destination: null,
    date: null,
    departureTime: null,
    timePeriod: null,
    tripType: "single_leg",
    transportMode: "any",
    allowAlternativeModes: false,
    preference: null,
    passengers: null,
    largeLuggage: null,
    excludePreviousRecommendation: false,
    needsClarification: false,
    clarificationQuestion: null,
    clarificationField: null,
    driverContactConsent: null,
    directDriverInquiry: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 安全性：conversationState 來自瀏覽器，伺服器不可信任
// ---------------------------------------------------------------------------

test("sanitizeConversationState：合法內容會完整保留", () => {
  const state = sanitizeConversationState({
    requestedDate: "2026-09-17",
    requestedTime: "09:30",
    timePeriod: "morning",
    origin: "高鐵嘉義站",
    waypoints: ["奮起湖"],
    destination: "茶香花園民宿",
    currentLocation: "奮起湖",
    lastArrivalTime: "11:30",
    lastDepartureTime: "09:30",
    lastRouteSegments: [
      { mode: "bus", fromKey: "高鐵嘉義站", toKey: "奮起湖", routeLabel: "7329 台灣好行A線", departTime: "09:30", arriveTime: "11:30", fareFull: 200, fareHalf: 100 },
    ],
    language: "zh",
  });
  assert.equal(state.requestedDate, "2026-09-17");
  assert.equal(state.origin, "高鐵嘉義站");
  assert.deepEqual(state.waypoints, ["奮起湖"]);
  assert.equal(state.lastRouteSegments.length, 1);
});

test("sanitizeConversationState：不存在的地點、路線代碼、格式錯誤的日期/時間一律拿掉，不會讓請求失敗", () => {
  const state = sanitizeConversationState({
    requestedDate: "not-a-date",
    requestedTime: "25:99",
    timePeriod: "someday",
    origin: "火星基地",
    waypoints: ["火星基地", "奮起湖", "達邦", "石棹", "隙頂", "觸口"], // 超過上限 + 含假地點
    destination: "茶香花園民宿",
    currentLocation: "<script>alert(1)</script>",
    lastArrivalTime: "not-a-time",
    lastDepartureTime: "09:30",
    lastRouteSegments: [
      { mode: "train", fromKey: "高鐵嘉義站", toKey: "奮起湖", routeLabel: "假造的班次編號", departTime: "09:30", arriveTime: "11:30", fareFull: 9999999, fareHalf: 100 },
      { mode: "bus", fromKey: "高鐵嘉義站", toKey: "奮起湖", routeLabel: "7329 台灣好行A線", departTime: "09:30", arriveTime: "11:30", fareFull: 200, fareHalf: 100 },
    ],
    language: "fr", // 不支援的語言
  });

  assert.equal(state.requestedDate, null);
  assert.equal(state.requestedTime, null);
  assert.equal(state.timePeriod, null);
  assert.equal(state.origin, null, "不存在的地點應該被拿掉");
  assert.ok(state.waypoints.length <= 5, "waypoints 數量必須有上限");
  assert.ok(!state.waypoints.includes("火星基地"), "假地點不應該出現在結果中");
  assert.equal(state.destination, "茶香花園民宿");
  assert.equal(state.currentLocation, null, "不存在的地點（含惡意字串）應該被拿掉");
  assert.equal(state.lastArrivalTime, null);
  assert.equal(state.lastRouteSegments.length, 1, "路線代碼不存在的假班次應該被剔除，只留下合法那筆");
  assert.equal(state.language, "zh", "不支援的語言要退回預設值");
});

test("sanitizeConversationState：非物件輸入（例如 null、字串、陣列）要回傳空狀態，不能丟例外", () => {
  assert.deepEqual(sanitizeConversationState(null), EMPTY_CONVERSATION_STATE);
  assert.deepEqual(sanitizeConversationState("hello"), EMPTY_CONVERSATION_STATE);
  assert.deepEqual(sanitizeConversationState([1, 2, 3]), EMPTY_CONVERSATION_STATE);
  assert.deepEqual(sanitizeConversationState(undefined), EMPTY_CONVERSATION_STATE);
});

// ---------------------------------------------------------------------------
// 合併規則
// ---------------------------------------------------------------------------

function stateWith(overrides: Partial<ConversationState>): ConversationState {
  return { ...EMPTY_CONVERSATION_STATE, ...overrides };
}

// 測試案例 1：使用者「明天從嘉義高鐵站去民宿」，後續「回來可以搭哪班車？」
test("案例1：去程終點已經是民宿時，「回來」代表把去程整個反過來（回到原出發站）", () => {
  const prevState = stateWith({
    requestedDate: "2026-09-17",
    origin: "高鐵嘉義站",
    destination: HOMESTAY_STOP,
    currentLocation: HOMESTAY_STOP,
    lastDepartureTime: "09:30",
    lastArrivalTime: "10:56",
  });
  // 假設 AI 正確解析出「回來」= 反轉行程
  const parsed = baseParsed({ origin: HOMESTAY_STOP, destination: "高鐵嘉義站" });
  const merged = mergeConversationTurn(parsed, prevState, FIXED_NOW);

  assert.equal(merged.kind, "resolved");
  if (merged.kind === "resolved") {
    assert.equal(merged.origin.key, HOMESTAY_STOP);
    assert.equal(merged.dest.key, "高鐵嘉義站");
    assert.equal(merged.dateISO, "2026-09-17", "日期應該沿用上一輪");
  }
});

// 測試案例 2：使用者「明天從民宿去奮起湖」，後續「回民宿呢？」
test("案例2：去程終點不是民宿時，「回民宿」代表從目前位置回到茶香花園民宿", () => {
  const prevState = stateWith({
    requestedDate: "2026-09-17",
    origin: HOMESTAY_STOP,
    destination: "奮起湖",
    currentLocation: "奮起湖",
    lastDepartureTime: "09:00",
    lastArrivalTime: "10:20",
  });
  const parsed = baseParsed({ origin: "奮起湖", destination: HOMESTAY_STOP });
  const merged = mergeConversationTurn(parsed, prevState, FIXED_NOW);

  assert.equal(merged.kind, "resolved");
  if (merged.kind === "resolved") {
    assert.equal(merged.origin.key, "奮起湖");
    assert.equal(merged.dest.key, HOMESTAY_STOP);
  }
});

// 測試案例 3：使用者「推薦09:30班次」，後續「可以晚一班嗎？」
test("案例3：「晚一班」搜尋下限必須晚於上一輪推薦的那一班，且沿用原本的出發地/目的地/日期", () => {
  const prevState = stateWith({
    requestedDate: FIXED_WEEKDAY_DATE,
    requestedTime: "09:30", // 上一輪查詢用的時間，這裡明確給定，避免測試結果受「實際現在時間」影響
    origin: "高鐵嘉義站",
    destination: HOMESTAY_STOP,
    lastDepartureTime: "09:30",
    lastArrivalTime: "10:56",
  });
  // 「可以晚一班嗎」：AI 不會重新給地點/時間，只會標記 excludePreviousRecommendation
  const parsed = baseParsed({ excludePreviousRecommendation: true });
  const merged = mergeConversationTurn(parsed, prevState, FIXED_NOW);

  assert.equal(merged.kind, "resolved");
  if (merged.kind === "resolved") {
    assert.equal(merged.origin.key, "高鐵嘉義站", "出發地應該沿用上一輪");
    assert.equal(merged.dest.key, HOMESTAY_STOP, "目的地應該沿用上一輪");
    assert.equal(merged.dateISO, FIXED_WEEKDAY_DATE, "日期應該沿用上一輪");

    const prevDepartEpoch = taipeiToEpochMs(FIXED_WEEKDAY_DATE, "09:30");
    assert.ok(merged.window.lowerEpochMs > prevDepartEpoch, "搜尋下限必須晚於上一輪推薦的那一班");

    const plan = planTrip({ originKey: merged.origin.key, destKey: merged.dest.key, dateISO: merged.dateISO, window: merged.window, transportMode: merged.transportMode });
    assert.equal(plan.status, "ok");
    assert.notEqual(plan.nextTrip?.departTime, "09:30", "不應該又推薦同一班");
  }
});

// 測試案例 4：使用者「明天早上從嘉義火車站出發」，後續「改成高鐵站」
test("案例4：只換出發地時，目的地／日期／時段應該維持不變", () => {
  const prevState = stateWith({
    requestedDate: "2026-09-17",
    timePeriod: "morning",
    origin: "嘉義火車站",
    destination: HOMESTAY_STOP,
  });
  const parsed = baseParsed({ origin: "高鐵嘉義站" }); // 只提到新出發地，其餘沒講
  const merged = mergeConversationTurn(parsed, prevState, FIXED_NOW);

  assert.equal(merged.kind, "resolved");
  if (merged.kind === "resolved") {
    assert.equal(merged.origin.key, "高鐵嘉義站", "出發地應該換成新講的");
    assert.equal(merged.dest.key, HOMESTAY_STOP, "目的地應該沿用上一輪");
    assert.equal(merged.dateISO, "2026-09-17", "日期應該沿用上一輪");
    assert.equal(merged.timePeriod, "morning", "時段應該沿用上一輪，因為這句話完全沒提到時間");
  }
});

// 測試案例 5：使用者「從奮起湖回民宿」，後續「那班車幾點到？」
test("案例5：追問「那班車幾點到」時完全沒提供新資訊，應該整組沿用上一輪並算出同一班車的抵達時間", () => {
  const prevState = stateWith({
    requestedDate: FIXED_WEEKDAY_DATE,
    origin: "奮起湖",
    destination: HOMESTAY_STOP,
  });
  const parsed = baseParsed(); // 完全沒有新資訊
  const merged = mergeConversationTurn(parsed, prevState, FIXED_NOW);

  assert.equal(merged.kind, "resolved");
  if (merged.kind === "resolved") {
    assert.equal(merged.origin.key, "奮起湖");
    assert.equal(merged.dest.key, HOMESTAY_STOP);
    const plan = planTrip({ originKey: merged.origin.key, destKey: merged.dest.key, dateISO: merged.dateISO, window: merged.window, transportMode: merged.transportMode });
    assert.equal(plan.status, "ok");
    assert.ok(plan.nextTrip?.arriveTime, "應該能算出抵達時間回答「幾點到」");
  }
});

test("上下文不足時（沒有上一輪，這句話也沒講地點）應該回報需要出發地，不能亂猜", () => {
  const parsed = baseParsed();
  const merged = mergeConversationTurn(parsed, EMPTY_CONVERSATION_STATE, FIXED_NOW);
  assert.equal(merged.kind, "need_origin");
});
