// 交通工具分流的自動測試：確保「指定火車就不會偷偷給公車，指定公車就不會偷偷給火車」，
// 沒有符合的班次時要誠實詢問是否接受替代方案，而不是自己擅自換掉。
// 不呼叫真正的 OpenAI —— 用「假設 AI 已經正確解析出的結果」直接餵給合併/規劃邏輯。
// 跑法：npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { findBusTrips, findTrainTrips } from "../app/lib/transit-assistant/transport";
import { planTrip, planMultiLegTrip, resolveSearchWindow } from "../app/lib/transit-assistant/route-planner";
import { mergeConversationTurn } from "../app/lib/transit-assistant/merge";
import { EMPTY_CONVERSATION_STATE, type ConversationState } from "../app/lib/transit-assistant/conversation";
import type { ParsedQuery } from "../app/lib/transit-assistant/openai-parser";
import { resolveLocationText } from "../app/lib/transit-assistant/locations";
import { getTaipeiNow, type TaipeiNow } from "../app/lib/transit-assistant/taipei-time";

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

// 用「離今天有幾天距離」而不是寫死日期字串，避免撞上真正的今天造成測試結果隨執行時間變動
const TEST_DATE = addDaysISO(getTaipeiNow().dateISO, 3);
const TEST_NOW: TaipeiNow = { dateISO: TEST_DATE, timeHHMM: "06:00", minutes: 360 };

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

function stateWith(overrides: Partial<ConversationState>): ConversationState {
  return { ...EMPTY_CONVERSATION_STATE, ...overrides };
}

// ---------------------------------------------------------------------------
// mode 分類：7302/7322/7329 必須是 bus，阿里山森林鐵路班次必須是 train
// ---------------------------------------------------------------------------

test("7302、7322、7329 全部分類為 bus，不會被標成 train", () => {
  const trips = findBusTrips("嘉義火車站", "奮起湖", "weekday");
  assert.ok(trips.length > 0, "應該查得到公車班次才能驗證");
  for (const t of trips) {
    assert.equal(t.mode, "bus", `${t.routeLabel} 應該是 bus`);
    assert.match(t.routeLabel, /^(7302|7322|7329)/);
  }
});

test("阿里山森林鐵路班次（阿里山號 N次）全部分類為 train，不會被標成 bus", () => {
  const trips = findTrainTrips("嘉義", "奮起湖");
  assert.ok(trips.length > 0, "應該查得到火車班次才能驗證");
  for (const t of trips) {
    assert.equal(t.mode, "train", `${t.routeLabel} 應該是 train`);
    assert.match(t.routeLabel, /^阿里山號/);
  }
});

// ---------------------------------------------------------------------------
// 對應回報問題：「明天七點從嘉義火車站搭火車到奮起湖」不可以回傳 7302 公車
// ---------------------------------------------------------------------------

test("指定火車時，不可以回傳公車班次（就算公車在同一時間有車）", () => {
  const origin = resolveLocationText("嘉義火車站")!;
  const dest = resolveLocationText("奮起湖")!;
  const window = resolveSearchWindow(TEST_DATE, "07:00", null);
  const plan = planTrip({ originKey: origin.key, destKey: dest.key, dateISO: TEST_DATE, window, transportMode: "train" });

  // 07:00 没有火车（营运资料只有 09:00 和 10:00），不该被静默换成公车 —— 应该是「询问是否接受替代方案」状态
  assert.equal(plan.status, "mode_unavailable_offer_alternative");
  assert.equal(plan.nextTrip, null, "不可以在這個狀態下自己選一班公車出來當作答案");
  assert.equal(plan.alternativeMode, "bus");
  assert.ok(plan.closestModeTrips.every((t) => t.mode === "train"), "建議的『最接近班次』必須也是火車，不能夾帶公車");
  const times = plan.closestModeTrips.map((t) => t.departTime).sort();
  assert.deepEqual(times, ["09:00", "10:00"], "最接近 07:00 的火車應該是 09:00 和 10:00");
});

test("指定公車時，不可以回傳火車班次", () => {
  const origin = resolveLocationText("嘉義火車站")!;
  const dest = resolveLocationText("奮起湖")!;
  const window = resolveSearchWindow(TEST_DATE, "07:00", null);
  const plan = planTrip({ originKey: origin.key, destKey: dest.key, dateISO: TEST_DATE, window, transportMode: "bus" });

  assert.equal(plan.status, "ok", "07:00 之後公車本來就有班次，不應該卡住");
  assert.equal(plan.nextTrip?.mode, "bus");
  for (const t of [plan.nextTrip, ...plan.moreTrips]) {
    assert.notEqual(t?.mode, "train", "指定公車時，候選班次裡不可以出現火車");
  }
});

test("火車在指定時間沒有班次時，回答內容不可以出現公車路線代碼", () => {
  const origin = resolveLocationText("嘉義火車站")!;
  const dest = resolveLocationText("奮起湖")!;
  const window = resolveSearchWindow(TEST_DATE, "07:00", null);
  const plan = planTrip({ originKey: origin.key, destKey: dest.key, dateISO: TEST_DATE, window, transportMode: "train" });

  // 用 route-planner 直接組字前先確認 plan 本身沒有帶出任何 bus 路線代碼
  const allTripsInPlan = [plan.nextTrip, ...plan.moreTrips, ...plan.closestModeTrips].filter(Boolean);
  for (const t of allTripsInPlan) {
    assert.doesNotMatch(t!.routeLabel, /^(7302|7322|7329)/, "不可以把公車路線代碼夾帶進火車查詢的結果裡");
  }
});

// ---------------------------------------------------------------------------
// 使用者同意「改搭公車」後，才可以顯示公車方案
// ---------------------------------------------------------------------------

test("使用者同意公車之前，合併結果仍然是 train；同意之後才會切成 bus", () => {
  // 第一輪：指定火車，07:00 沒車，系統詢問是否接受公車
  const firstParsed = baseParsed({ origin: "嘉義火車站", destination: "奮起湖", date: TEST_DATE, departureTime: "07:00", transportMode: "train" });
  const firstMerged = mergeConversationTurn(firstParsed, EMPTY_CONVERSATION_STATE, TEST_NOW);
  assert.equal(firstMerged.kind, "resolved");
  if (firstMerged.kind !== "resolved") return;
  assert.equal(firstMerged.transportMode, "train");

  const stateAfterOffer = stateWith({
    requestedDate: TEST_DATE,
    requestedTime: "07:00",
    origin: "嘉義火車站",
    destination: "奮起湖",
    transportMode: "train",
  });

  // 使用者還沒表態前，如果只是問別的追問、AI 沒有偵測到同意，交通工具應該還是 train（不能自己偷偷換成 bus）
  const stillAskingParsed = baseParsed({ transportMode: "any" }); // AI 沒偵測到新的交通工具字眼
  const stillMerged = mergeConversationTurn(stillAskingParsed, stateAfterOffer, TEST_NOW);
  assert.equal(stillMerged.kind, "resolved");
  if (stillMerged.kind === "resolved") {
    assert.equal(stillMerged.transportMode, "train", "使用者還沒同意前，不可以自己切換成公車");
  }

  // 使用者同意：「可以搭公車」，AI 應該解析出 transportMode="bus" + allowAlternativeModes=true
  const consentParsed = baseParsed({ transportMode: "bus", allowAlternativeModes: true });
  const consentMerged = mergeConversationTurn(consentParsed, stateAfterOffer, TEST_NOW);
  assert.equal(consentMerged.kind, "resolved");
  if (consentMerged.kind !== "resolved") return;
  assert.equal(consentMerged.transportMode, "bus", "使用者同意之後，才可以改成公車查詢");

  const plan = planTrip({
    originKey: consentMerged.origin.key,
    destKey: consentMerged.dest.key,
    dateISO: consentMerged.dateISO,
    window: consentMerged.window,
    transportMode: consentMerged.transportMode,
  });
  assert.equal(plan.status, "ok");
  assert.equal(plan.nextTrip?.mode, "bus");
});

// ---------------------------------------------------------------------------
// 多段行程：每一段各自標示正確的交通方式
// ---------------------------------------------------------------------------

test("多段行程：第一段依指定的火車查詢，第二段（轉乘）正確標示為公車", () => {
  const origin = resolveLocationText("嘉義火車站")!;
  const waypoint = resolveLocationText("奮起湖")!;
  const dest = resolveLocationText("茶香花園民宿")!;
  const stopsInOrder = [origin.key, waypoint.key, dest.key];

  // 09:00 那班火車查得到（不是 07:00），確保第一段是 ok，可以往下驗證第二段
  const window = resolveSearchWindow(TEST_DATE, "09:00", null);
  const multi = planMultiLegTrip(stopsInOrder, TEST_DATE, window, "train");

  assert.equal(multi.legs.length, 2);
  assert.equal(multi.legs[0].plan.status, "ok");
  assert.equal(multi.legs[0].plan.nextTrip?.mode, "train", "第一段應該是火車，因為使用者明確指定");

  assert.equal(multi.legs[1].plan.status, "ok");
  assert.equal(multi.legs[1].plan.nextTrip?.mode, "bus", "第二段（奮起湖到民宿）目前只有公車，應該正確標示為公車，不可以標成火車");
});
