// 森林鐵路「下一班」判斷的測試：旅客可能從中途站（北門、奮起湖）上車，不能只看始發站。
// 跑法：npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { RAIL_UPWARD, RAIL_DOWNWARD } from "../app/lib/rail-data";
import { statusesFor } from "../app/lib/rail-status";
import { timeToMinutes } from "../app/lib/schedule-utils";

const at = (hhmm: string) => timeToMinutes(hhmm);

test("還沒掛載（沒有現在時間）時不顯示任何狀態", () => {
  assert.deepEqual(statusesFor(RAIL_UPWARD, null), RAIL_UPWARD.map(() => null));
});

test("一大早：上山第一班是下一班，站名是始發站嘉義", () => {
  const [first, second] = statusesFor(RAIL_UPWARD, at("07:00"));
  assert.equal(first?.kind, "next");
  if (first?.kind === "next") {
    assert.equal(first.stop, RAIL_UPWARD[0].segments[0].stop);
    assert.equal(first.minutesLeft, at(RAIL_UPWARD[0].segments[0].time) - at("07:00"));
  }
  assert.equal(second?.kind, "later");
});

test("始發站開走、但還沒到北門：仍是下一班，提示改成北門的時間", () => {
  const trip = RAIL_UPWARD[0];
  const origin = trip.segments[0];
  const middle = trip.segments[1];
  const now = at(origin.time) + 1; // 始發站剛開走 1 分鐘
  assert.ok(now <= at(middle.time), "測試前提：中途站時間要晚於始發站");
  const [first] = statusesFor(RAIL_UPWARD, now);
  assert.equal(first?.kind, "next");
  if (first?.kind === "next") {
    assert.equal(first.stop, middle.stop);
    assert.equal(first.time, middle.time);
  }
});

test("終點站只下車：所有可上車的站都開走後算已發車", () => {
  const trip = RAIL_UPWARD[0];
  const lastBoarding = trip.segments[trip.segments.length - 2];
  const [first] = statusesFor(RAIL_UPWARD, at(lastBoarding.time) + 1);
  assert.equal(first?.kind, "past");
});

test("晚上：兩個方向全部都已發車", () => {
  assert.ok(statusesFor(RAIL_UPWARD, at("23:00")).every((s) => s?.kind === "past"));
  assert.ok(statusesFor(RAIL_DOWNWARD, at("23:00")).every((s) => s?.kind === "past"));
});

test("每個方向最多只有一班標成下一班", () => {
  for (const hhmm of ["06:00", "09:05", "10:05", "12:00", "14:00", "16:00"]) {
    for (const trips of [RAIL_UPWARD, RAIL_DOWNWARD]) {
      const nexts = statusesFor(trips, at(hhmm)).filter((s) => s?.kind === "next");
      assert.ok(nexts.length <= 1, `${hhmm} 出現 ${nexts.length} 班下一班`);
    }
  }
});
