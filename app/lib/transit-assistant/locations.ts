// 地點解析：把旅客輸入（快速按鈕、GPS 最近站、或 OpenAI 解析出的地名文字）
// 對應到 app/lib/bus-data.ts / local-bus-data.ts 既有站名字串，做為班次計算的查詢鍵。
// 這裡完全不呼叫 OpenAI，也不建立第二份班次資料，只做「文字/座標 -> 既有站名」的對照。

import { HOMESTAY_STOP } from "../bus-data";

/** 站名解析結果。key 直接對應 findUnifiedTrips 可用的站名字串。 */
export interface ResolvedLocation {
  key: string;
  isHomestay: boolean;
  /** 使用者原本講的是「龍頭坪站」時記下來，用來附上接送提醒 */
  mentionedLongtouping: boolean;
}

// 別名表：一個既有站名 key，對應旅客可能輸入的各種中／英／簡體說法。
// key 本身務必和 bus-data.ts / local-bus-data.ts 內的站名字串完全一致。
const ALIASES: Record<string, string[]> = {
  高鐵嘉義站: [
    "高鐵嘉義站", "嘉義高鐵站", "高铁嘉义站", "嘉义高铁站", "高鐵站", "高铁站",
    "thsr chiayi station", "thsr chiayi", "chiayi hsr station", "chiayi hsr",
    "chiayi high speed rail station", "high speed rail station", "hsr chiayi", "thsr",
  ],
  嘉義大雅站: ["嘉義大雅站", "嘉义大雅站", "大雅站", "chiayi daya station", "daya station"],
  嘉義火車站: [
    "嘉義火車站", "嘉义火车站", "嘉義車站", "嘉义车站", "火車站", "火车站",
    "chiayi railway station", "chiayi train station", "chiayi station", "chiayi tra station",
  ],
  頂六國小: ["頂六國小", "顶六国小", "頂六", "顶六", "dingliu elementary school", "dingliu"],
  吳鳳廟: ["吳鳳廟", "吴凤庙", "wufeng temple"],
  觸口遊客中心: ["觸口遊客中心", "触口游客中心", "chukou visitor center", "chukou visitor centre"],
  愛情大草原: ["愛情大草原", "爱情大草原", "love prairie"],
  觸口: ["觸口", "触口", "chukou"],
  公興森態園區: ["公興森態園區", "公兴森态园区", "gongxing forest park"],
  龍美: ["龍美", "龙美", "longmei"],
  二延平步道: ["二延平步道", "eryanping trail", "eryanping"],
  隙頂: ["隙頂", "隙顶", "xiding"],
  石棹: ["石棹", "shizhuo"],
  奮起湖: ["奮起湖", "奋起湖", "fenqihu", "fenchihu", "fenqihu old street"],
  十字村: ["十字村", "shizi community", "shizi village"],
  青年活動中心: ["青年活動中心", "青年活动中心", "youth activity center"],
  阿里山轉運站: [
    "阿里山轉運站", "阿里山转运站", "阿里山園區", "阿里山园区", "阿里山車站", "阿里山车站",
    "阿里山國家森林遊樂區", "阿里山国家森林游乐区", "阿里山森林遊樂區", "阿里山",
    "alishan bus terminal", "alishan terminal", "alishan station", "alishan",
    "alishan national forest recreation area", "alishan forest recreation area", "alishan park",
  ],
  故宮南院: ["故宮南院", "故宫南院", "southern branch of the npm", "national palace museum southern branch"],
  達邦: ["達邦", "达邦", "dabang"],
  // 北門只有阿里山森林鐵路停靠，沒有公車路線行經；留在這裡讓旅客可以直接講「北門」查火車班次
  北門: ["北門", "北门", "beimen", "beimen station"],
};

// 龍頭站／龍頭坪站／民宿：三個講法都對應同一個 HOMESTAY_STOP 站點資料，
// 但要記住旅客講的是不是「龍頭坪站」，回答時才能附上接送提醒（見 answer-builder.ts）。
const HOMESTAY_ALIASES = [
  "龍頭站", "龙头站",
  "龍頭站/龍頭坪站(茶香花園民宿)", "龙头站/龙头坪站(茶香花园民宿)",
  "longtou station", "longtou",
];
const LONGTOUPING_ALIASES = [
  "龍頭坪站", "龙头坪站", "longtouping station", "longtouping",
];
const B_AND_B_ALIASES = [
  "茶香花園民宿", "茶香花园民宿", "民宿", "alishan tea garden b&b", "alishan tea garden bnb",
  "tea garden b&b", "tea garden bnb", "the b&b", "the bnb", "our b&b",
];

interface AnchorCoord {
  key: string;
  lat: number;
  lng: number;
}

// 主要地標的概略座標，僅用於「使用目前位置」時挑選距離最近的已知站點，
// 不做精確地理編碼（尚未設定地圖/地理編碼服務），精確度足以判斷旅客大致在哪一段路廊。
const ANCHOR_COORDS: AnchorCoord[] = [
  { key: "高鐵嘉義站", lat: 23.4577, lng: 120.3419 },
  { key: "嘉義火車站", lat: 23.4801, lng: 120.3218 },
  { key: "觸口", lat: 23.4557, lng: 120.5661 },
  { key: "隙頂", lat: 23.4749, lng: 120.6497 },
  { key: HOMESTAY_STOP, lat: 23.474, lng: 120.679 },
  { key: "石棹", lat: 23.4936, lng: 120.6875 },
  { key: "奮起湖", lat: 23.508, lng: 120.6854 },
  { key: "阿里山轉運站", lat: 23.5098, lng: 120.8022 },
];

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "");
}

/** 把旅客輸入的地點文字解析成既有站名 key；找不到則回傳 null（應由呼叫端請旅客澄清）。 */
export function resolveLocationText(raw: string | null | undefined): ResolvedLocation | null {
  if (!raw) return null;
  const norm = normalize(raw);
  if (!norm) return null;

  if (B_AND_B_ALIASES.some((a) => normalize(a) === norm)) {
    return { key: HOMESTAY_STOP, isHomestay: true, mentionedLongtouping: false };
  }
  if (LONGTOUPING_ALIASES.some((a) => normalize(a) === norm)) {
    return { key: HOMESTAY_STOP, isHomestay: true, mentionedLongtouping: true };
  }
  if (HOMESTAY_ALIASES.some((a) => normalize(a) === norm)) {
    return { key: HOMESTAY_STOP, isHomestay: true, mentionedLongtouping: false };
  }

  // 先找完全相符的別名，再退而求其次找「輸入內容包含別名」的最長匹配（例如旅客多打了「我在...」）
  let best: { key: string; len: number } | null = null;
  for (const [key, aliases] of Object.entries(ALIASES)) {
    for (const alias of aliases) {
      const a = normalize(alias);
      if (!a) continue;
      if (a === norm) return { key, isHomestay: false, mentionedLongtouping: false };
      if (norm.includes(a) && (!best || a.length > best.len)) {
        best = { key, len: a.length };
      }
    }
  }
  if (best) return { key: best.key, isHomestay: false, mentionedLongtouping: false };
  return null;
}

function haversineKm(a: AnchorCoord, lat: number, lng: number): number {
  const R = 6371;
  const dLat = ((lat - a.lat) * Math.PI) / 180;
  const dLng = ((lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** GPS 座標 -> 距離最近的已知站點；只用於本次計算，呼叫端不得儲存座標。 */
export function nearestStopFromCoords(lat: number, lng: number): { key: string; distanceKm: number } {
  let best = ANCHOR_COORDS[0];
  let bestDist = haversineKm(best, lat, lng);
  for (const a of ANCHOR_COORDS.slice(1)) {
    const d = haversineKm(a, lat, lng);
    if (d < bestDist) {
      best = a;
      bestDist = d;
    }
  }
  return { key: best.key, distanceKm: Math.round(bestDist * 10) / 10 };
}

export const QUICK_LOCATIONS = [
  "高鐵嘉義站",
  "嘉義火車站",
  "奮起湖",
  "阿里山轉運站",
  "龍頭站",
  "龍頭坪站",
  "茶香花園民宿",
] as const;
