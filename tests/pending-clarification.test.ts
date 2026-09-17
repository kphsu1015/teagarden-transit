// 「澄清問題之後的簡短回答」自動測試：確保問完「幾點出發」之後，
// 旅客只回「8點」不會把已經問出來的出發地、目的地、日期、交通工具清空重問一次。
// 不呼叫真正的 OpenAI —— 用「假設 AI 已經正確解析出的結果」直接餵給合併邏輯。
// 跑法：npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { EMPTY_CONVERSATION_STATE, buildUpdatedConversationState, type ConversationState } from "../app/lib/transit-assistant/conversation";
import { mergeConversationTurn } from "../app/lib/transit-assistant/merge";
import type { ParsedQuery } from "../app/lib/transit-assistant/openai-parser";
import { getTaipeiNow, type TaipeiNow } from "../app/lib/transit-assistant/taipei-time";
import { HOMESTAY_STOP } from "../app/lib/bus-data";

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

const TOMORROW = addDaysISO(getTaipeiNow().dateISO, 1);
const NOW: TaipeiNow = getTaipeiNow();

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

// 案例一：「明天從阿里山去奮起湖，再到民宿」→ 系統問時間 →「8點」
test("案例一：問完時間後只回「8點」，應沿用阿里山、奮起湖、民宿及明天，只補上 08:00", () => {
  const turn1 = baseParsed({
    origin: "阿里山園區",
    waypoints: ["奮起湖"],
    destination: "茶香花園民宿",
    date: TOMORROW,
    needsClarification: true,
    clarificationField: "requestedTime",
    clarificationQuestion: "請問您明天預計幾點從阿里山出發？",
  });
  const stateAfterTurn1 = buildUpdatedConversationState(turn1, EMPTY_CONVERSATION_STATE, "zh");

  // 回歸重點：問完問題之後，出發地/中途點/目的地/日期不可以被清空
  assert.equal(stateAfterTurn1.origin, "阿里山轉運站");
  assert.deepEqual(stateAfterTurn1.waypoints, ["奮起湖"]);
  assert.equal(stateAfterTurn1.destination, HOMESTAY_STOP);
  assert.equal(stateAfterTurn1.requestedDate, TOMORROW);
  assert.equal(stateAfterTurn1.pendingClarification, "requestedTime");

  // 第二句「8點」：AI 應該只解析出 departureTime，其餘留白讓系統沿用
  const turn2 = baseParsed({ departureTime: "08:00" });
  const stateAfterTurn2 = buildUpdatedConversationState(turn2, stateAfterTurn1, "zh");

  assert.equal(stateAfterTurn2.origin, "阿里山轉運站", "出發地不可以被清掉");
  assert.deepEqual(stateAfterTurn2.waypoints, ["奮起湖"], "中途點不可以被清掉");
  assert.equal(stateAfterTurn2.destination, HOMESTAY_STOP, "目的地不可以被清掉");
  assert.equal(stateAfterTurn2.requestedDate, TOMORROW, "日期不可以被清掉");
  assert.equal(stateAfterTurn2.requestedTime, "08:00", "應該補上剛剛回答的時間");
  assert.equal(stateAfterTurn2.pendingClarification, null, "補齊之後不應該再卡著等待");

  // 立刻可以繼續原本的路線查詢，不需要再問一次地點
  const merged = mergeConversationTurn(turn2, stateAfterTurn1, NOW);
  assert.equal(merged.kind, "resolved");
  if (merged.kind === "resolved") {
    assert.equal(merged.origin.key, "阿里山轉運站");
    assert.equal(merged.waypoints.length, 1);
    assert.equal(merged.waypoints[0].key, "奮起湖");
    assert.equal(merged.dest.key, HOMESTAY_STOP);
    assert.equal(merged.requestedTime, "08:00");
  }
});

// 案例二：「明天從嘉義高鐵站去民宿」→ 系統問時間 →「早上」
test("案例二：問完時間後回「早上」，應保留原行程並設定 timePeriod=morning", () => {
  const turn1 = baseParsed({
    origin: "高鐵嘉義站",
    destination: "茶香花園民宿",
    date: TOMORROW,
    needsClarification: true,
    clarificationField: "requestedTime",
    clarificationQuestion: "請問您明天預計幾點從嘉義高鐵站出發？",
  });
  const stateAfterTurn1 = buildUpdatedConversationState(turn1, EMPTY_CONVERSATION_STATE, "zh");
  assert.equal(stateAfterTurn1.pendingClarification, "requestedTime");

  const turn2 = baseParsed({ timePeriod: "morning" });
  const stateAfterTurn2 = buildUpdatedConversationState(turn2, stateAfterTurn1, "zh");

  assert.equal(stateAfterTurn2.origin, "高鐵嘉義站", "出發地應該保留");
  assert.equal(stateAfterTurn2.destination, HOMESTAY_STOP, "目的地應該保留");
  assert.equal(stateAfterTurn2.requestedDate, TOMORROW, "日期應該保留");
  assert.equal(stateAfterTurn2.timePeriod, "morning");
  assert.equal(stateAfterTurn2.requestedTime, null, "給了時段就不該留著舊的確切時間");
  assert.equal(stateAfterTurn2.pendingClarification, null);
});

// 案例三：「明天8點從阿里山出發」→「改成9點」
test("案例三：明確要求「改成9點」時，只把 requestedTime 換成 09:00，其餘不變", () => {
  const turn1 = baseParsed({ origin: "阿里山園區", date: TOMORROW, departureTime: "08:00" });
  const merged1 = mergeConversationTurn(turn1, EMPTY_CONVERSATION_STATE, NOW);
  assert.equal(merged1.kind, "resolved");
  if (merged1.kind !== "resolved") return;

  const stateAfterTurn1: ConversationState = {
    ...EMPTY_CONVERSATION_STATE,
    requestedDate: merged1.dateISO,
    requestedTime: merged1.requestedTime,
    origin: merged1.origin.key,
    destination: merged1.dest.key,
    transportMode: merged1.transportMode,
    language: "zh",
  };
  assert.equal(stateAfterTurn1.requestedTime, "08:00");

  const turn2 = baseParsed({ departureTime: "09:00" });
  const stateAfterTurn2 = buildUpdatedConversationState(turn2, stateAfterTurn1, "zh");

  assert.equal(stateAfterTurn2.requestedTime, "09:00", "應該改成新講的時間");
  assert.equal(stateAfterTurn2.origin, "阿里山轉運站", "出發地不應該被動到");
  assert.equal(stateAfterTurn2.destination, stateAfterTurn1.destination, "目的地不應該被動到");
  assert.equal(stateAfterTurn2.requestedDate, stateAfterTurn1.requestedDate, "日期不應該被動到");
});

// 案例四：「明天從阿里山經奮起湖到民宿」→「不去奮起湖了」
test("案例四：使用者明確說「不去奮起湖了」時，才可以清除 waypoints", () => {
  const turn1 = baseParsed({
    origin: "阿里山園區",
    waypoints: ["奮起湖"],
    destination: "茶香花園民宿",
    date: TOMORROW,
    tripType: "multi_leg",
  });
  const stateAfterTurn1 = buildUpdatedConversationState(turn1, EMPTY_CONVERSATION_STATE, "zh");
  assert.deepEqual(stateAfterTurn1.waypoints, ["奮起湖"]);

  // 一般的追問（沒有明確清除信號）不可以把 waypoints 洗掉
  const unrelatedTurn = baseParsed({ departureTime: "08:00" });
  const stateAfterUnrelated = buildUpdatedConversationState(unrelatedTurn, stateAfterTurn1, "zh");
  assert.deepEqual(stateAfterUnrelated.waypoints, ["奮起湖"], "沒有明確取消時，中途點不可以被清空");

  // 明確取消：「不去奮起湖了」
  const cancelTurn = baseParsed({ clearWaypoints: true, tripType: "single_leg" });
  const stateAfterCancel = buildUpdatedConversationState(cancelTurn, stateAfterTurn1, "zh");
  assert.deepEqual(stateAfterCancel.waypoints, [], "明確取消之後，中途點才可以被清空");
  assert.equal(stateAfterCancel.origin, "阿里山轉運站", "取消中途點不應該影響出發地");
  assert.equal(stateAfterCancel.destination, HOMESTAY_STOP, "取消中途點不應該影響目的地");

  const merged = mergeConversationTurn(cancelTurn, stateAfterTurn1, NOW);
  assert.equal(merged.kind, "resolved");
  if (merged.kind === "resolved") {
    assert.equal(merged.waypoints.length, 0, "查詢時也不應該再帶著已取消的中途點");
  }
});
