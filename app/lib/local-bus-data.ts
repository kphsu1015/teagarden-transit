// 資料來源：嘉義縣公共汽車管理處官網（bus.cyhg.gov.tw）公路客運時刻表 及
// 「阿里山、奮起湖、達邦整合時刻表」，更新日期 115.08.01（2026-08-01）。
// 這兩條路線是在地日常公車（非台灣好行觀光專車），逐站時間官方僅公告起訖站發車時間，
// 未提供每一小站精確到站時刻；本站在 schedule-utils.ts 中以 B 線（7322）各站間的實際時間差，
// 換算 7302/7314 行經龍頭站/龍頭坪站等共用路段站點的估計時刻，並標示為「估計」。
// 實際到站時間仍建議以嘉義縣公車即時動態查詢確認（縣公車有 GPS 即時動態，比推算更準確）。

export interface LocalBusTrip {
  time: string;
  note?: string;
}

export interface LocalBusRoute {
  id: "7302" | "7314";
  label: string;
  destLabel: string; // 遠端終點站（奮起湖 / 達邦）
  gatewayLabel: string; // 起點端站名
  toDest: LocalBusTrip[]; // 從 gatewayLabel 出發，行經龍頭站/龍頭坪站，往 destLabel
  toGateway: LocalBusTrip[]; // 從 destLabel 出發，行經龍頭站/龍頭坪站，往 gatewayLabel
}

export const LOCAL_ROUTES: LocalBusRoute[] = [
  {
    id: "7302",
    label: "7302 奮起湖線",
    destLabel: "奮起湖",
    gatewayLabel: "嘉義大雅站",
    toDest: [{ time: "06:55" }, { time: "14:55" }],
    toGateway: [{ time: "09:00" }, { time: "17:00" }],
  },
  {
    id: "7314",
    label: "7314 達邦線",
    destLabel: "達邦",
    gatewayLabel: "嘉義大雅站",
    toDest: [
      { time: "05:45", note: "上班日行駛" },
      { time: "10:55", note: "假日行駛" },
      { time: "16:55" },
    ],
    toGateway: [
      { time: "08:00", note: "上班日行駛" },
      { time: "14:10", note: "假日行駛" },
      { time: "19:10" },
    ],
  },
];
