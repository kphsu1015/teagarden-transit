// 票價資料的自動測試：官方票價表是人工轉成程式資料的，所以用「結構檢查」「不同路線交叉比對」
// 「官方票價表上直接讀出的實際數字」三種方式，抓出抄錯的數字。
// 跑法：npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { getFareTable, lookupFare, MAIN_STATIONS, type FareRouteNo } from "../app/lib/fare-data";
import { HOMESTAY_STOP, ROUTE_A, ROUTE_B } from "../app/lib/bus-data";
import { findUnifiedTrips } from "../app/lib/schedule-utils";

const ROUTES: FareRouteNo[] = ["7322", "7329", "7302", "7314"];
const METHODS = ["cash", "card"] as const;

test("每一列票價的格數，等於它在站序中的位置（三角形票價表）", () => {
  for (const r of ROUTES) {
    for (const m of METHODS) {
      const t = getFareTable(r, m);
      assert.equal(t.full.length, t.stations.length - 1, `${r} ${m} 全票列數`);
      assert.equal(t.half.length, t.stations.length - 1, `${r} ${m} 半票列數`);
      t.full.forEach((row, i) => assert.equal(row.length, i + 1, `${r} ${m} 全票第 ${i + 1} 列(${t.stations[i + 1]})`));
      t.half.forEach((row, i) => assert.equal(row.length, i + 1, `${r} ${m} 半票第 ${i + 1} 列(${t.stations[i + 1]})`));
    }
  }
});

test("半票約為全票的一半（誤差 1 元內），且刷卡不會比現金貴", () => {
  for (const r of ROUTES) {
    const cash = getFareTable(r, "cash");
    const card = getFareTable(r, "card");
    cash.full.forEach((row, j) =>
      row.forEach((f, i) => {
        const where = `${r} ${cash.stations[i]}→${cash.stations[j + 1]}`;
        assert.ok(Math.abs(cash.half[j][i] - f / 2) <= 1, `${where} 現金半票 ${cash.half[j][i]} vs 全票 ${f}`);
        assert.ok(Math.abs(card.half[j][i] - card.full[j][i] / 2) <= 1, `${where} 刷卡半票`);
        assert.ok(card.full[j][i] <= f, `${where} 刷卡 ${card.full[j][i]} 不應高於現金 ${f}`);
      })
    );
  }
});

test("主線上：站越遠票價不會變便宜（抓抄錯數字）", () => {
  // 只檢查 7322 主線（大雅站…阿里山轉運站），不含繞駛支線；7314 只檢查石棹之後那條支線
  const mainEnd = MAIN_STATIONS.indexOf("阿里山轉運站");
  for (const m of METHODS) {
    const t = getFareTable("7322", m);
    for (const kind of ["full", "half"] as const) {
      for (let i = 0; i <= mainEnd; i++) {
        for (let j = i + 1; j < mainEnd; j++) {
          // 離 i 站更遠的 j+1 站，票價 >= j 站
          assert.ok(t[kind][j][i] >= t[kind][j - 1][i], `7322 ${m} ${kind} ${t.stations[i]}→${t.stations[j + 1]} 不應比→${t.stations[j]} 便宜`);
          // 從更遠的 i 站出發，票價 >= 從 i+1 站出發
          if (i + 1 < j + 1) assert.ok(t[kind][j][i] >= t[kind][j][i + 1], `7322 ${m} ${kind} ${t.stations[i]}→${t.stations[j + 1]} 不應比 ${t.stations[i + 1]}→ 便宜`);
        }
      }
    }
  }
});

// ───────────── 對照官方票價表上直接讀出的數字 ─────────────

test("龍頭坪→阿里山轉運站：現金 100/50、刷卡 88/44（官方票價表）", () => {
  for (const r of ["7322", "7329"] as FareRouteNo[]) {
    const q = lookupFare(r, HOMESTAY_STOP, "阿里山轉運站")!;
    assert.deepEqual(q.cash, { full: 100, half: 50 }, r);
    assert.deepEqual(q.card, { full: 88, half: 44 }, r);
  }
});

test("7322 各站到阿里山轉運站的整列（現金／刷卡），與官方表最後一列一致", () => {
  const cashFull = [254, 244, 229, 222, 216, 210, 201, 194, 188, 179, 161, 142, 134, 126, 116, 108, 100, 83, 64, 38, 26];
  const cashHalf = [127, 122, 114, 111, 108, 105, 100, 97, 94, 89, 80, 71, 67, 63, 58, 54, 50, 41, 32, 19, 13];
  const cardFull = [223, 214, 201, 195, 190, 184, 176, 171, 165, 157, 141, 125, 118, 111, 102, 95, 88, 73, 57, 33, 22];
  const cardHalf = [112, 107, 101, 98, 95, 92, 88, 85, 83, 79, 71, 62, 59, 55, 51, 47, 44, 36, 28, 17, 11];
  const cash = getFareTable("7322", "cash");
  const card = getFareTable("7322", "card");
  const end = MAIN_STATIONS.indexOf("阿里山轉運站");
  assert.deepEqual(cash.full[end - 1], cashFull);
  assert.deepEqual(cash.half[end - 1], cashHalf);
  assert.deepEqual(card.full[end - 1], cardFull);
  assert.deepEqual(card.half[end - 1], cardHalf);
});

test("7302 奮起湖線：奮起湖終點站那一列，與官方 7302 票價表一致", () => {
  const cash = getFareTable("7302", "cash");
  const card = getFareTable("7302", "card");
  const last = cash.stations.length - 2;
  assert.equal(cash.stations.at(-1), "奮起湖終點站");
  assert.deepEqual(cash.full[last], [189, 178, 164, 157, 151, 145, 135, 129, 123, 113, 95, 76, 69, 61, 51, 43, 35, 26]);
  assert.deepEqual(cash.half[last], [94, 89, 82, 78, 76, 72, 68, 64, 61, 57, 48, 38, 34, 30, 25, 21, 17, 13]);
  assert.deepEqual(card.full[last], [166, 157, 144, 138, 133, 127, 119, 113, 108, 100, 84, 67, 60, 53, 44, 37, 30, 23]);
  assert.deepEqual(card.half[last], [83, 78, 72, 69, 66, 63, 60, 57, 54, 50, 42, 34, 30, 27, 22, 19, 15, 11]);
});

test("7314 達邦線：大雅站→達邦、龍頭坪→達邦、石棹→達邦（官方 7314 票價表）", () => {
  const q = lookupFare("7314", "嘉義大雅站", "達邦")!;
  assert.deepEqual(q.cash, { full: 214, half: 107 });
  assert.deepEqual(q.card, { full: 188, half: 94 });
  const homestay = lookupFare("7314", HOMESTAY_STOP, "達邦")!;
  assert.deepEqual(homestay.cash, { full: 60, half: 30 });
  assert.deepEqual(homestay.card, { full: 53, half: 26 });
  const shizhuo = lookupFare("7314", "石棹", "達邦")!;
  assert.deepEqual(shizhuo.cash, { full: 42, half: 21 });
  assert.deepEqual(shizhuo.card, { full: 37, half: 19 });
});

test("7329 A 線：高鐵嘉義站→阿里山轉運站 283/142（現金）、249/124（刷卡）", () => {
  const q = lookupFare("7329", "高鐵嘉義站", "阿里山轉運站")!;
  assert.deepEqual(q.cash, { full: 283, half: 142 });
  assert.deepEqual(q.card, { full: 249, half: 124 });
});

test("7329 A 線：高鐵嘉義站→龍頭坪 183/92、故宮南院→頂六國小 83/42、故宮南院→高鐵嘉義站 25/12", () => {
  const home = lookupFare("7329", "高鐵嘉義站", HOMESTAY_STOP)!;
  assert.deepEqual(home.cash, { full: 183, half: 92 });
  assert.deepEqual(home.card, { full: 161, half: 81 });
  const palace = lookupFare("7329", "故宮南院", "頂六國小")!;
  assert.deepEqual(palace.cash, { full: 83, half: 42 });
  assert.deepEqual(palace.card, { full: 73, half: 37 });
  const palaceToHsr = lookupFare("7329", "故宮南院", "高鐵嘉義站")!;
  assert.deepEqual(palaceToHsr.cash, { full: 25, half: 12 });
  assert.deepEqual(palaceToHsr.card, { full: 22, half: 11 });
});

test("7329 各站到阿里山轉運站整列，與官方 7329 票價表最後一列一致（頂六國小起）", () => {
  const cash = getFareTable("7329", "cash");
  const card = getFareTable("7329", "card");
  const end = cash.stations.indexOf("阿里山轉運站");
  assert.deepEqual(cash.full[end - 1], [283, 216, 210, 201, 194, 188, 179, 161, 142, 134, 126, 116, 108, 100, 83, 64, 38, 26]);
  assert.deepEqual(cash.half[end - 1], [142, 108, 105, 100, 97, 94, 89, 80, 71, 67, 63, 58, 54, 50, 41, 32, 19, 13]);
  assert.deepEqual(card.full[end - 1], [249, 190, 184, 176, 171, 165, 157, 141, 125, 118, 111, 102, 95, 88, 73, 57, 33, 22]);
  assert.deepEqual(card.half[end - 1], [124, 95, 92, 88, 85, 83, 79, 71, 62, 59, 55, 51, 47, 44, 36, 28, 17, 11]);
});

// ───────────── 網站站名對應與整合 ─────────────

test("觸口遊客中心、愛情大草原以觸口計價；兩者互查（同一計價站）沒有票價，不亂報", () => {
  const a = lookupFare("7322", "吳鳳廟", "觸口遊客中心")!;
  const b = lookupFare("7322", "吳鳳廟", "愛情大草原")!;
  const c = lookupFare("7322", "吳鳳廟", "觸口")!;
  assert.deepEqual(a, c);
  assert.deepEqual(b, c);
  assert.equal(lookupFare("7322", "觸口遊客中心", "愛情大草原"), null);
});

test("A 線 7329 與 B 線 7322 對同一段路（龍頭坪→阿里山）票價一致", () => {
  const trips = findUnifiedTrips(HOMESTAY_STOP, "阿里山轉運站", "weekday");
  const bus = trips.filter((t) => t.routeLabel.includes("7329") || t.routeLabel.includes("7322"));
  assert.ok(bus.length > 0);
  for (const t of bus) {
    assert.equal(t.fareFull, 100, t.routeLabel);
    assert.equal(t.cardFareFull, 88, t.routeLabel);
  }
});

test("7302／7314 在地公車現在也有票價（大雅站→龍頭坪、大雅站→達邦）", () => {
  const toHome = findUnifiedTrips("嘉義大雅站", HOMESTAY_STOP, "weekday").filter((t) => t.routeLabel.includes("7302"));
  assert.ok(toHome.length > 0);
  for (const t of toHome) {
    assert.equal(t.fareFull, 154);
    assert.equal(t.cardFareFull, 135);
  }
  const toDabang = findUnifiedTrips("嘉義大雅站", "達邦", "weekday").filter((t) => t.routeLabel.includes("7314"));
  assert.ok(toDabang.length > 0);
  for (const t of toDabang) {
    assert.equal(t.fareFull, 214);
    assert.equal(t.cardFareFull, 188);
  }
});

// ───────────── 各路線的站點範圍 ─────────────

test("只有 7329 A 線有高鐵嘉義站與故宮南院；7322 B 線的站點和票價表都沒有這兩站", () => {
  assert.ok(getFareTable("7329", "cash").stations.includes("高鐵嘉義站"));
  assert.ok(getFareTable("7329", "cash").stations.includes("故宮南院"));
  for (const r of ["7322", "7302", "7314"] as FareRouteNo[]) {
    const st = getFareTable(r, "cash").stations;
    assert.ok(!st.includes("高鐵嘉義站") && !st.includes("故宮南院"), r);
  }
  assert.ok(ROUTE_A.outbound.stops.includes("高鐵嘉義站") && ROUTE_A.inbound.stops.includes("故宮南院"));
  for (const dir of [ROUTE_B.outbound.stops, ROUTE_B.inbound.stops]) {
    assert.ok(!dir.includes("高鐵嘉義站") && !dir.includes("故宮南院"));
  }
  for (const [o, d] of [["高鐵嘉義站", "阿里山轉運站"], ["故宮南院", "高鐵嘉義站"], ["高鐵嘉義站", "龍頭站/龍頭坪站(茶香花園民宿)"]]) {
    const labels = findUnifiedTrips(o, d, "weekday").map((t) => t.routeLabel);
    assert.ok(labels.length > 0, `${o}→${d}`);
    assert.ok(labels.every((l) => l.includes("7329")), `${o}→${d} 只能是 7329：${labels.join(",")}`);
  }
});

test("7302 奮起湖線只到奮起湖，不會出現在十字村、青年活動中心、阿里山轉運站的班次", () => {
  for (const [o, d] of [
    ["嘉義大雅站", "阿里山轉運站"],
    ["嘉義大雅站", "青年活動中心"],
    ["嘉義大雅站", "十字村"],
    ["石棹", "阿里山轉運站"],
    ["奮起湖", "阿里山轉運站"],
    ["阿里山轉運站", "嘉義大雅站"],
    ["阿里山轉運站", HOMESTAY_STOP],
    ["十字村", "嘉義大雅站"],
  ]) {
    for (const dayType of ["weekday", "weekend"] as const) {
      const bad = findUnifiedTrips(o, d, dayType).filter((t) => t.routeLabel.includes("7302"));
      assert.equal(bad.length, 0, `${o}→${d} 不應有 7302`);
    }
  }
  // 到奮起湖本身還是有 7302，而且有票價
  const ok = findUnifiedTrips("嘉義大雅站", "奮起湖", "weekday").filter((t) => t.routeLabel.includes("7302"));
  assert.ok(ok.length > 0);
  for (const t of ok) {
    assert.equal(t.fareFull, 189);
    assert.equal(t.cardFareFull, 166);
  }
});

test("7314 達邦線仍然不會出現在石棹之後的站（奮起湖、十字村、阿里山轉運站）", () => {
  for (const [o, d] of [["嘉義大雅站", "奮起湖"], ["嘉義大雅站", "阿里山轉運站"], ["十字村", "嘉義大雅站"]]) {
    const bad = findUnifiedTrips(o, d, "weekday").filter((t) => t.routeLabel.includes("7314"));
    assert.equal(bad.length, 0, `${o}→${d} 不應有 7314`);
  }
});
