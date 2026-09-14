// 資料來源：阿里山林業鐵路及文化資產管理處官網（afrch.forest.gov.tw）
// 適用時刻表自 2025-01-10 生效版本整理，資料整理時間 2026-09-14。
// 森林鐵路班次會因養護工程、天候等因素調整，且目前每日僅少數班次，
// 出發前請務必至官網或訂票系統確認正確班次與是否有停駛公告。

export interface RailTrip {
  no: string;
  note?: string;
  segments: { stop: string; time: string }[];
}

export const RAIL_UPWARD: RailTrip[] = [
  {
    no: "阿里山號 1次",
    segments: [
      { stop: "嘉義", time: "09:00" },
      { stop: "北門", time: "09:10" },
      { stop: "奮起湖", time: "11:30" },
    ],
    note: "奮起湖站停留約 65 分鐘後續駛",
  },
  {
    no: "阿里山號 5次",
    segments: [
      { stop: "嘉義", time: "10:00" },
      { stop: "北門", time: "10:08" },
      { stop: "奮起湖", time: "12:16" },
      { stop: "阿里山", time: "14:56" },
    ],
    note: "奮起湖站停留至 13:21 續駛往阿里山",
  },
];

export const RAIL_DOWNWARD: RailTrip[] = [
  {
    no: "阿里山號 8次",
    segments: [
      { stop: "阿里山", time: "11:50" },
      { stop: "北門", time: "15:39" },
      { stop: "嘉義", time: "15:45" },
    ],
  },
  {
    no: "阿里山號 2次",
    segments: [
      { stop: "奮起湖", time: "14:31" },
      { stop: "北門", time: "16:45" },
      { stop: "嘉義", time: "16:51" },
    ],
    note: "奮起湖 13:50 到站、14:31 續駛下山",
  },
];

// 各班次抵達奮起湖、可供旅客下車轉乘公車的時間點（供「轉乘公車」功能篩選銜接得上的班次用）
export const FENQIHU_ARRIVALS: { trainNo: string; time: string }[] = [
  { trainNo: "阿里山號 1次", time: "11:30" },
  { trainNo: "阿里山號 5次", time: "12:16" },
  { trainNo: "阿里山號 2次", time: "13:50" },
];

// 參考票價（全票/半票），依官網公告整理，僅供參考
export const RAIL_FARES: { pair: string; full: number; half: number }[] = [
  { pair: "嘉義／北門 ↔ 奮起湖", full: 384, half: 192 },
  { pair: "奮起湖 ↔ 阿里山", full: 216, half: 108 },
  { pair: "嘉義／北門 ↔ 阿里山", full: 600, half: 300 },
];
