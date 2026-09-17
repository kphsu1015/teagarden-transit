// 「完全查不到班次時詢問是否提供包車司機聯絡方式」的自動測試。
// 不呼叫真正的 OpenAI —— 直接測試 route-planner 的判斷邏輯，以及 answer-builder 產生的文字內容。
// 跑法：npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { planTrip, resolveSearchWindow, isNoServiceStatus } from "../app/lib/transit-assistant/route-planner";
import { buildAnswer, driverOfferQuestion, buildDriverContactAnswer, buildDriverDeclineAnswer } from "../app/lib/transit-assistant/answer-builder";
import { CHARTER_DRIVERS } from "../app/lib/transit-assistant/drivers";
import { getTaipeiNow } from "../app/lib/transit-assistant/taipei-time";
import { HOMESTAY_STOP } from "../app/lib/bus-data";

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

const TEST_DATE = addDaysISO(getTaipeiNow().dateISO, 3);

test("查無路線（no_route）：isNoServiceStatus 判定為真，回覆內容要問是否提供包車司機", () => {
  // 故宮南院和達邦之間目前的資料裡沒有直達路線
  const window = resolveSearchWindow(TEST_DATE, "08:00", null);
  const plan = planTrip({ originKey: "故宮南院", destKey: "達邦", dateISO: TEST_DATE, window, transportMode: "bus" });

  assert.equal(plan.status, "no_route");
  assert.equal(isNoServiceStatus(plan), true);

  const reply = buildAnswer({ lang: "zh", plan, mentionedLongtouping: false, preference: null, passengers: null, largeLuggage: null });
  assert.match(reply, /包車司機的聯絡方式/, "查無路線時應該主動問是否提供包車司機聯絡方式");
  assert.match(reply, /是／否/, "應該附上是/否的提示");
});

test("末班車已過（missed_last）：一樣要問是否提供包車司機", () => {
  const window = resolveSearchWindow(TEST_DATE, "23:50", null);
  const plan = planTrip({ originKey: "高鐵嘉義站", destKey: HOMESTAY_STOP, dateISO: TEST_DATE, window, transportMode: "bus" });

  assert.equal(plan.status, "missed_last");
  assert.equal(isNoServiceStatus(plan), true);

  const reply = buildAnswer({ lang: "zh", plan, mentionedLongtouping: false, preference: null, passengers: null, largeLuggage: null });
  assert.match(reply, /包車司機的聯絡方式/);
});

test("正常查得到班次（ok）：不應該出現包車司機的詢問", () => {
  const window = resolveSearchWindow(TEST_DATE, "08:00", null);
  const plan = planTrip({ originKey: "高鐵嘉義站", destKey: HOMESTAY_STOP, dateISO: TEST_DATE, window, transportMode: "bus" });

  assert.equal(plan.status, "ok");
  assert.equal(isNoServiceStatus(plan), false);

  const reply = buildAnswer({ lang: "zh", plan, mentionedLongtouping: false, preference: null, passengers: null, largeLuggage: null });
  assert.doesNotMatch(reply, /包車司機的聯絡方式/, "有正常班次時不應該主動問包車司機");
});

test("同意提供司機聯絡方式後，回覆內容要包含兩位司機的完整、正確聯絡資訊與固定聲明", () => {
  const reply = buildDriverContactAnswer("zh");

  // 逐一比對，確保是原樣輸出使用者提供的真實資料，沒有被改寫或省略
  assert.match(reply, /林先生/);
  assert.match(reply, /奮起湖在地司機/);
  assert.match(reply, /0920353559/);

  assert.match(reply, /許先生/);
  assert.match(reply, /嘉義市司機/);
  assert.match(reply, /0980478335/);
  assert.match(reply, /jr741212/);
  assert.match(reply, /\+886980478335/);

  // 固定聲明必須完整出現（逐字比對，這是業者要求的確切文字）
  assert.match(reply, /民宿只代為提供聯絡資訊，報價請直接跟司機確認。/);

  // 資料本身也要跟 drivers.ts 裡的原始資料完全一致，不會被中途改動
  assert.equal(CHARTER_DRIVERS.length, 2);
  assert.equal(CHARTER_DRIVERS[0].phone, "0920353559");
  assert.equal(CHARTER_DRIVERS[1].phone, "0980478335");
  assert.equal(CHARTER_DRIVERS[1].lineId, "jr741212");
  assert.equal(CHARTER_DRIVERS[1].whatsapp, "+886980478335");
});

test("拒絕提供司機聯絡方式時，回覆不應該包含任何電話或聯絡資訊", () => {
  const reply = buildDriverDeclineAnswer("zh");
  assert.doesNotMatch(reply, /09\d{8}/, "婉拒時不應該出現電話號碼");
  assert.doesNotMatch(reply, /林先生|許先生/);
});

test("driverOfferQuestion 三種語言都要能正確產生（不拋例外、內容非空）", () => {
  for (const lang of ["zh", "zh-CN", "en"] as const) {
    const q = driverOfferQuestion(lang);
    assert.ok(q.length > 0);
  }
});
