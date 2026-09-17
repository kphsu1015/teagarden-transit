// 交通小幫手的自動測試。用 Node 內建的 test runner（透過 tsx 執行 TypeScript），
// 不需要額外的測試框架，也不會呼叫真正的 OpenAI API（避免 CI 內不穩定或產生費用）。
// 跑法：npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveLocationText } from "../app/lib/transit-assistant/locations";
import { planTrip, planMultiLegTrip, resolveSearchWindow } from "../app/lib/transit-assistant/route-planner";
import { buildAnswer, buildMultiLegAnswer } from "../app/lib/transit-assistant/answer-builder";
import { getTaipeiNow, taipeiToEpochMs } from "../app/lib/transit-assistant/taipei-time";
import { HOMESTAY_STOP } from "../app/lib/bus-data";

// 固定用一個平日日期＋一個班次還沒開始的時間，讓「不牽涉今天現在時間」的測試可重複執行、結果穩定。
const FIXED_WEEKDAY_DATE = "2026-09-16"; // 星期三
const FIXED_MORNING_TIME = "08:00";

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

test("resolveLocationText: 阿里山 / 阿里山園區 都對應到阿里山轉運站站名資料", () => {
  assert.equal(resolveLocationText("阿里山")?.key, "阿里山轉運站");
  assert.equal(resolveLocationText("阿里山園區")?.key, "阿里山轉運站");
});

test("resolveLocationText: 民宿／茶香花園民宿／Tea Garden B&B 都對應到民宿站點", () => {
  assert.equal(resolveLocationText("民宿")?.key, HOMESTAY_STOP);
  assert.equal(resolveLocationText("茶香花園民宿")?.key, HOMESTAY_STOP);
  assert.equal(resolveLocationText("Tea Garden B&B")?.key, HOMESTAY_STOP);
});

test("resolveLocationText: 龍頭坪站要標記接送提醒，龍頭站不用", () => {
  assert.equal(resolveLocationText("龍頭坪站")?.mentionedLongtouping, true);
  assert.equal(resolveLocationText("龍頭站")?.mentionedLongtouping, false);
});

test("resolveLocationText: 無法辨識的地點回傳 null（呼叫端應改問澄清問題，而不是自己亂猜）", () => {
  assert.equal(resolveLocationText("火星基地"), null);
  assert.equal(resolveLocationText(""), null);
  assert.equal(resolveLocationText(null), null);
});

// ---------------------------------------------------------------------------
// 日期/時間判斷（對應回報問題：「明天早上」被誤用今天現在的時分過濾，導致誤判末班車已過）
// ---------------------------------------------------------------------------

test("今天沒有指定時間/時段：搜尋下限使用現在的台灣時間（已發車的班次會被排除）", () => {
  const now = getTaipeiNow();
  const window = resolveSearchWindow(now.dateISO, null, null);
  assert.equal(window.lowerEpochMs, taipeiToEpochMs(now.dateISO, now.timeHHMM));
  assert.equal(window.upperEpochMs, null);
});

test("未來日期（明天）沒有指定時間/時段：不可套用今天現在的時間，明天一早的班次不可被排除", () => {
  const now = getTaipeiNow();
  const tomorrowISO = addDaysISO(now.dateISO, 1);
  const window = resolveSearchWindow(tomorrowISO, null, null);

  // 未來日期沒給時間，應該從當天 00:00 開始（顯示整天班次），不是現在的時分
  assert.equal(window.lowerEpochMs, taipeiToEpochMs(tomorrowISO, "00:00"));
  assert.notEqual(
    window.lowerEpochMs,
    taipeiToEpochMs(tomorrowISO, now.timeHHMM),
    "不應該把今天的現在時分套用到明天的日期上"
  );

  // 就算現在時間已經很晚（例如晚上 11 點），明天最早一班公車也不該被判定成「已發車」
  const plan = planTrip({ originKey: "高鐵嘉義站", destKey: HOMESTAY_STOP, dateISO: tomorrowISO, window, transportMode: "bus" });
  assert.equal(plan.status, "ok", "明天一早的班次不應該被誤判成末班車已過");
  assert.equal(plan.nextTrip?.departTime, "09:30", "明天第一班應該是當天時刻表最早的 09:30");
});

test("今天查詢「後天早上」：時段查詢限定在後天 06:00–12:00 之間，不受現在時間影響，並提供多個選擇", () => {
  const now = getTaipeiNow();
  const dayAfterTomorrowISO = addDaysISO(now.dateISO, 2);
  const window = resolveSearchWindow(dayAfterTomorrowISO, null, "morning");

  assert.equal(window.lowerEpochMs, taipeiToEpochMs(dayAfterTomorrowISO, "06:00"));
  assert.equal(window.upperEpochMs, taipeiToEpochMs(dayAfterTomorrowISO, "12:00"));

  const plan = planTrip({ originKey: "高鐵嘉義站", destKey: HOMESTAY_STOP, dateISO: dayAfterTomorrowISO, window, transportMode: "bus" });
  assert.equal(plan.status, "ok");
  assert.equal(plan.nextTrip?.departTime, "09:30");
  assert.equal(plan.moreTrips.length, 2, "早上時段內，除了下一班還應該有 2 班可選（09:30／10:10／11:00 共 3 班）");
});

test("跨月底：8/31 23:50 應該早於 9/1 00:10（換算成絕對時間點才能正確跨月比較，不能只比 HH:mm）", () => {
  const aug31 = taipeiToEpochMs("2026-08-31", "23:50");
  const sep1 = taipeiToEpochMs("2026-09-01", "00:10");
  assert.ok(aug31 < sep1);
});

test("跨年底：12/31 23:50 應該早於隔年 1/1 00:10", () => {
  const dec31 = taipeiToEpochMs("2026-12-31", "23:50");
  const jan1 = taipeiToEpochMs("2027-01-01", "00:10");
  assert.ok(dec31 < jan1);
});

test("台灣日期與 UTC 日期不同的情況：台灣當地 00:30 換算成 UTC 是前一天 16:30", () => {
  const epoch = taipeiToEpochMs("2026-09-17", "00:30");
  const utcDate = new Date(epoch);
  assert.equal(utcDate.getUTCFullYear(), 2026);
  assert.equal(utcDate.getUTCMonth(), 8); // 0-indexed：8 = 9月
  assert.equal(utcDate.getUTCDate(), 16);
  assert.equal(utcDate.getUTCHours(), 16);
  assert.equal(utcDate.getUTCMinutes(), 30);
});

// ---------------------------------------------------------------------------
// 多段行程
// ---------------------------------------------------------------------------

// 對應回報問題：「明天我想從嘉義高鐵先去阿里山，然後再來民宿，可以怎麼安排？」
// AI 應該解析成 origin=嘉義高鐵站、waypoints=["阿里山園區"]、destination=茶香花園民宿、tripType=multi_leg。
// 這裡直接用「假設 AI 已經正確解析出的結果」餵給地點解析＋多段班次計算，
// 驗證問題出在班次計算層還是地點解析層都會被這個測試抓到，且不需要真的打 OpenAI API。
test("多段行程：嘉義高鐵站 -> 阿里山園區 -> 茶香花園民宿，三個地點都能被解析", () => {
  const origin = resolveLocationText("嘉義高鐵站");
  const waypoint = resolveLocationText("阿里山園區");
  const dest = resolveLocationText("茶香花園民宿");

  assert.ok(origin, "origin 應該要能解析成功");
  assert.ok(waypoint, "waypoint（阿里山園區）應該要能解析成功 —— 這是之前『地點暫時無法辨識』回歸的重點");
  assert.ok(dest, "destination 應該要能解析成功");
});

test("多段行程：planMultiLegTrip 依序規劃兩段，且第二段一定依第一段實際抵達時間查詢，不會用第一段的原始起始時間", () => {
  const origin = resolveLocationText("嘉義高鐵站")!;
  const waypoint = resolveLocationText("阿里山園區")!;
  const dest = resolveLocationText("茶香花園民宿")!;

  const stopsInOrder = [origin.key, waypoint.key, dest.key];
  const window = resolveSearchWindow(FIXED_WEEKDAY_DATE, FIXED_MORNING_TIME, null);
  const multi = planMultiLegTrip(stopsInOrder, FIXED_WEEKDAY_DATE, window);

  assert.equal(multi.legs.length, 2, "應該產生兩段行程（起點->中途點、中途點->終點）");
  assert.equal(multi.legs[0].fromKey, "高鐵嘉義站");
  assert.equal(multi.legs[0].toKey, "阿里山轉運站");
  assert.equal(multi.legs[1].fromKey, "阿里山轉運站");
  assert.equal(multi.legs[1].toKey, HOMESTAY_STOP);
  assert.equal(multi.overallStatus, "ok", "在早上 08:00 出發，兩段都應該找得到班次");

  const leg1 = multi.legs[0].plan;
  const leg2 = multi.legs[1].plan;
  assert.ok(leg1.nextTrip, "第一段應該有算出下一班");
  assert.ok(leg2.nextTrip, "第二段應該有算出下一班");

  // 重點回歸測試：第二段的搜尋下限，必須是第一段實際抵達時間（+轉乘緩衝），不是原始的 08:00
  const leg1ArriveEpoch = taipeiToEpochMs(FIXED_WEEKDAY_DATE, leg1.nextTrip!.arriveTime ?? leg1.nextTrip!.departTime);
  assert.equal(leg2.window.lowerEpochMs > leg1ArriveEpoch, true, "第二段的搜尋下限應該晚於第一段的抵達時間（含轉乘緩衝）");
  assert.notEqual(leg2.window.lowerEpochMs, window.lowerEpochMs, "第二段不可以再用第一段最原始的查詢時間");

  // 第二段的發車時間本身也不應早於第一段抵達時間
  assert.ok(
    leg2.nextTrip!.departMinutes >= 0 && taipeiToEpochMs(FIXED_WEEKDAY_DATE, leg2.nextTrip!.departTime) >= leg1ArriveEpoch,
    `第二段發車時間(${leg2.nextTrip!.departTime})不應早於第一段抵達時間(${leg1.nextTrip!.arriveTime})`
  );

  // 答案組字不應該丟例外，且應該包含免責聲明
  const reply = buildMultiLegAnswer({ lang: "zh", multi, mentionedLongtouping: false });
  assert.match(reply, /班次及票價.*臨時調整/);
  assert.match(reply, /第 1 段/);
  assert.match(reply, /第 2 段/);
});

test("多段行程：其中一段查無路線時，誠實停在那一段、不繼續假設後面銜接得上", () => {
  // 用兩個彼此之間沒有直達資料的站點組成中途點，確保第一段就卡住
  const stopsInOrder = ["故宮南院", "達邦", HOMESTAY_STOP];
  const window = resolveSearchWindow(FIXED_WEEKDAY_DATE, FIXED_MORNING_TIME, null);
  const multi = planMultiLegTrip(stopsInOrder, FIXED_WEEKDAY_DATE, window);

  assert.equal(multi.overallStatus, "blocked");
  assert.equal(multi.blockedAtIndex, 0);
  // 卡住之後就不應該再往下規劃第二段
  assert.equal(multi.legs.length, 1);

  const reply = buildMultiLegAnswer({ lang: "zh", multi, mentionedLongtouping: false });
  assert.match(reply, /查不到.*直達路線|建議直接聯繫民宿/);
});

// ---------------------------------------------------------------------------
// 單段行程（既有功能不受影響）
// ---------------------------------------------------------------------------

test("單段行程：嘉義高鐵站 -> 民宿，08:00 出發應該找得到班次", () => {
  const window = resolveSearchWindow(FIXED_WEEKDAY_DATE, FIXED_MORNING_TIME, null);
  const plan = planTrip({ originKey: "高鐵嘉義站", destKey: HOMESTAY_STOP, dateISO: FIXED_WEEKDAY_DATE, window, transportMode: "bus" });
  assert.equal(plan.status, "ok");
  assert.ok(plan.nextTrip);

  const reply = buildAnswer({
    lang: "zh",
    plan,
    mentionedLongtouping: false,
    preference: null,
    passengers: null,
    largeLuggage: null,
  });
  assert.match(reply, /為您安排的交通方式/);
  assert.match(reply, /今天最後一班/, "應該提醒今天末班車時間");
  assert.match(reply, /班次及票價.*臨時調整/);
});
