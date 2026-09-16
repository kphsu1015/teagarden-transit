export type Lang = "zh" | "zh-CN" | "en";

/** 站名對照表（僅供顯示用，資料比對仍以繁體中文站名為主鍵） */
const STOP_NAME_SC: Record<string, string> = {
  高鐵嘉義站: "高铁嘉义站",
  嘉義大雅站: "嘉义大雅站",
  嘉義火車站: "嘉义火车站",
  頂六國小: "顶六国小",
  吳鳳廟: "吴凤庙",
  觸口遊客中心: "触口游客中心",
  愛情大草原: "爱情大草原",
  觸口: "触口",
  公興森態園區: "公兴森态园区",
  龍美: "龙美",
  二延平步道: "二延平步道",
  隙頂: "隙顶",
  "龍頭站/龍頭坪站(茶香花園民宿)": "龙头站/龙头坪站(茶香花园民宿)",
  石棹: "石棹",
  奮起湖: "奋起湖",
  十字村: "十字村",
  青年活動中心: "青年活动中心",
  阿里山轉運站: "阿里山转运站",
  故宮南院: "故宫南院",
  達邦: "达邦",
  嘉義: "嘉义",
  北門: "北门",
  阿里山: "阿里山",
};

const STOP_NAME_EN: Record<string, string> = {
  高鐵嘉義站: "THSR Chiayi Station",
  嘉義大雅站: "Chiayi Daya Station",
  嘉義火車站: "Chiayi Railway Station",
  頂六國小: "Dingliu Elementary School",
  吳鳳廟: "Wufeng Temple",
  觸口遊客中心: "Chukou Visitor Center",
  愛情大草原: "Love Prairie",
  觸口: "Chukou",
  公興森態園區: "Gongxing Forest Park",
  龍美: "Longmei",
  二延平步道: "Eryanping Trail",
  隙頂: "Xiding",
  "龍頭站/龍頭坪站(茶香花園民宿)": "Longtou/Longtouping Station (Tea Garden B&B)",
  石棹: "Shizhuo",
  奮起湖: "Fenqihu",
  十字村: "Shizi Community",
  青年活動中心: "Youth Activity Center",
  阿里山轉運站: "Alishan Bus Terminal",
  故宮南院: "Southern Branch of the NPM",
  達邦: "Dabang",
  嘉義: "Chiayi",
  北門: "Beimen",
  阿里山: "Alishan",
};

export function stopName(name: string, lang: Lang): string {
  if (lang === "zh") return name;
  if (lang === "zh-CN") return STOP_NAME_SC[name] ?? name;
  return STOP_NAME_EN[name] ?? name;
}

/** 常見班次備註對照表 */
const NOTE_SC: Record<string, string> = {
  上班日行駛: "上班日行驶",
  假日行駛: "假日行驶",
  "奮起湖站停留約 65 分鐘後續駛": "奋起湖站停留约 65 分钟后续驶",
  "奮起湖站停留至 13:21 續駛往阿里山": "奋起湖站停留至 13:21 续驶往阿里山",
  "奮起湖 13:50 到站、14:31 續駛下山": "奋起湖 13:50 到站、14:31 续驶下山",
};

const NOTE_EN: Record<string, string> = {
  上班日行駛: "Weekdays only",
  假日行駛: "Weekends & holidays only",
  "奮起湖站停留約 65 分鐘後續駛": "Stops ~65 min at Fenqihu, then continues",
  "奮起湖站停留至 13:21 續駛往阿里山": "Stops at Fenqihu until 13:21, then continues to Alishan",
  "奮起湖 13:50 到站、14:31 續駛下山": "Arrives Fenqihu 13:50, departs 14:31 downhill",
};

export function noteText(note: string | undefined, lang: Lang): string | undefined {
  if (!note) return undefined;
  if (lang === "zh") return note;
  if (lang === "zh-CN") return NOTE_SC[note] ?? note;
  return NOTE_EN[note] ?? note;
}

/** 票價區間名稱（如「嘉義／北門 ↔ 奮起湖」）對照表 */
const FARE_PAIR_SC: Record<string, string> = {
  "嘉義／北門 ↔ 奮起湖": "嘉义／北门 ↔ 奋起湖",
  "奮起湖 ↔ 阿里山": "奋起湖 ↔ 阿里山",
  "嘉義／北門 ↔ 阿里山": "嘉义／北门 ↔ 阿里山",
};

const FARE_PAIR_EN: Record<string, string> = {
  "嘉義／北門 ↔ 奮起湖": "Chiayi/Beimen ↔ Fenqihu",
  "奮起湖 ↔ 阿里山": "Fenqihu ↔ Alishan",
  "嘉義／北門 ↔ 阿里山": "Chiayi/Beimen ↔ Alishan",
};

export function farePairText(pair: string, lang: Lang): string {
  if (lang === "zh") return pair;
  if (lang === "zh-CN") return FARE_PAIR_SC[pair] ?? pair;
  return FARE_PAIR_EN[pair] ?? pair;
}

export function trainNoText(no: string, lang: Lang): string {
  if (lang === "zh") return no;
  if (lang === "zh-CN") return no.replace("號", "号");
  const m = no.match(/阿里山號\s*(\d+)次/);
  return m ? `Alishan Train No. ${m[1]}` : no;
}

const ROUTE_LABEL_SC: Record<string, string> = {
  "7329 台灣好行A線": "7329 台湾好行A线",
  "7322 台灣好行B線": "7322 台湾好行B线",
  "7302 奮起湖線": "7302 奋起湖线",
  "7314 達邦線": "7314 达邦线",
};

const ROUTE_LABEL_EN: Record<string, string> = {
  "7329 台灣好行A線": "7329 Tourist Shuttle Route A",
  "7322 台灣好行B線": "7322 Tourist Shuttle Route B",
  "7302 奮起湖線": "7302 Fenqihu Line",
  "7314 達邦線": "7314 Dabang Line",
};

export function routeLabelText(label: string, lang: Lang): string {
  if (lang === "zh") return label;
  if (lang === "zh-CN") return ROUTE_LABEL_SC[label] ?? label;
  return ROUTE_LABEL_EN[label] ?? label;
}

export interface UIDict {
  heroKicker: string;
  heroTitle1: string;
  heroTitle2: string;
  heroP1: string;
  heroP2: string;
  navBus: string;
  navRail: string;
  navDrive: string;
  navMap: string;
  backHome: string;

  howToTitle: string;
  driveTitle: string;
  driveAddressLabel: string;
  driveDirections: string;
  driveWarning: string;
  driveUpTitle: string;
  driveReturnTitle: string;
  driveVideosLabel: string;
  driveVideo1: string;
  driveVideo2: string;
  driveReturnPhoto1Caption: string;
  driveReturnPhoto2Caption: string;

  busCardTitle: string;
  busCardBody: (stop: string) => string;

  railCardTitle: string;
  railCardBody: (stop: string) => string;

  busSectionTitle: string;
  busSectionBody: (stop: string) => string;
  busSectionWarn: (stop: string) => string;

  railSectionTitle: string;
  railSectionBody: (stop: string) => string;

  contactTitle: string;
  openInMaps: string;
  footer: string;

  finderIntro: string;
  originLabel: string;
  destLabel: string;
  swapAria: string;
  dateLabel: string;
  nowLabelPrefix: string;
  showingToday: string;
  showingOtherDate: (date: string, weekend: boolean) => string;
  pickDifferentStops: string;
  noDirectTrips: (o: string, d: string) => string;
  estimatedTag: string;
  fareFull: string;
  fareHalf: string;
  fareUnknown: string;
  doneForToday: string;
  showFullTimetable: (show: boolean, o: string, d: string, n: number) => string;

  railDisclaimer1: string;
  railDisclaimerStrong: string;
  railUpTitle: string;
  railDownTitle: string;
  transferTitle: (stop: string) => string;
  transferNone: string;
  fareRefTitle: string;
  officialTimetable: string;
  onlineBooking: string;

  driveBtn: string;
  driveModalTitle: string;
  driveCaption1: string;
  driveCaption2: string;
  driveCaption3: string;
  driveModalDirections: string;
  driveModalGo: string;
  driveModalClose: string;

  eyebrowHowTo: string;
  eyebrowBus: string;
  eyebrowRail: string;
  eyebrowDrive: string;
  eyebrowContact: string;
  featureRoutes: string;
  featureWalk: string;
  featureRail: string;

  homeIntroTitle: string;
  homeCardCta: string;

  mapPageTitle: string;
  mapEmpty: string;
  mapSource: string;
  mapZoomClose: string;
}

export const UI: Record<Lang, UIDict> = {
  zh: {
    heroKicker: "嘉義・奮起湖・阿里山",
    heroTitle1: "茶香花園民宿",
    heroTitle2: "交通與班次查詢",
    heroP1: "茶香花園民宿鄰近「龍頭站」及「龍頭坪站」。您可搭乘台灣好行阿里山線公車、奮起湖線、達邦線公車，或搭乘阿里山森林鐵路轉乘公車前來。",
    heroP2: "於龍頭站或龍頭坪站下車後，步行約10～15分鐘即可抵達民宿。以下提供即時班次查詢，並可依照目前時間協助您確認是否來得及搭乘下一班車。",
    navBus: "搭乘公車",
    navRail: "搭乘主線小火車",
    navDrive: "開車",
    navMap: "阿里山全區旅遊地圖",
    backHome: "回首頁",

    howToTitle: "怎麼來民宿",
    driveTitle: "自行開車",
    driveAddressLabel: "地址：",
    driveDirections: "國道三號 → 下中埔交流道 → 沿阿里山公路(台18線)往阿里山方向 → 龍頭 → 約抵57.9km處左上方小路約200公尺即可抵達。",
    driveWarning: "⚠ 山區不建議使用導航系統，請勿走嘉130鄉道公田路段，也勿在57.6K左轉英迪格酒店。",
    driveUpTitle: "從嘉義上山方向",
    driveReturnTitle: "從阿里山、奮起湖、石桌回程下山方向",
    driveVideosLabel: "參考行車指引影片：",
    driveVideo1: "抵達民宿前的影片",
    driveVideo2: "阿里山、奮起湖、石桌、回程方向",
    driveReturnPhoto1Caption: "從阿里山或奮起湖返回民宿的入口",
    driveReturnPhoto2Caption: "斜坡繼續往上開約200公尺即可到達民宿",

    busCardTitle: "搭乘公車",
    busCardBody: (stop: string) =>
      `從嘉義火車站或高鐵嘉義站搭台灣好行阿里山線公車（A線／B線），或嘉義縣公車 7302 奮起湖線、7314 達邦線，都會行經${stop}，下車後民宿就在附近，可事先與我們聯繫接駁或步行前來。台灣好行班次較密集，奮起湖線、達邦線班次較少但貼近在地生活作息，適合抓準時間搭乘。建議提前10分鐘等候。`,

    railCardTitle: "搭阿里山森林鐵路",
    railCardBody: (stop: string) =>
      `從嘉義站或北門站搭阿里山森林鐵路至「奮起湖」站，再轉乘公車下山至${stop}即可抵達；班次較少，建議先訂票並確認時間（詳見下方轉乘資訊）。`,

    busSectionTitle: "公車班次查詢",
    busSectionBody: (stop: string) =>
      `選擇起訖站即可，系統會自動整合台灣好行阿里山線（A／B線）與 7302 奮起湖線、7314 達邦線四條路線，依現在時間列出接下來可搭乘的班次；已預設迄站為${stop}。`,
    busSectionWarn: (stop: string) =>
      `⚠ 提醒：選單中的「奮起湖」並非每一班 A／B 線公車都停靠（僅少數「經奮起湖」班次），若選「奮起湖」查無班次是正常現象；但${stop}幾乎每一班 A／B 線公車都有停靠，查詢結果較穩定。`,

    railSectionTitle: "阿里山森林鐵路時刻",
    railSectionBody: (stop: string) =>
      `目前每日班次不多，建議事先上網訂票並保留較充裕的轉乘時間。抵達奮起湖後可轉乘台灣好行公車回${stop}（見下方轉乘時刻）。`,

    contactTitle: "位置與聯絡",
    openInMaps: "在 Google 地圖上開啟",
    footer: "本頁班次與票價資料整理自台灣好行阿里山線、嘉義縣公共汽車管理處、阿里山林業鐵路及文化資產管理處官方公告（整理時間 2026-09-14），實際班次、票價如有調整請以官方公告為準。如發現資料有誤或已過時，歡迎與民宿聯繫告知，我們會盡快更新。",

    finderIntro: "自動整合台灣好行阿里山線（A／B線）與 7302 奮起湖線、7314 達邦線四條路線；選今天可依現在時間列出接下來可搭乘的班次，選其他日期則列出當天全部班次。",
    originLabel: "起站",
    destLabel: "迄站",
    swapAria: "交換起訖站",
    dateLabel: "搭乘日期",
    nowLabelPrefix: "現在台灣時間",
    showingToday: "（顯示今天接下來可搭乘的班次）",
    showingOtherDate: (date: string, weekend: boolean) => `（顯示 ${date} 全天班次，${weekend ? "假日班表" : "平日班表"}）`,
    pickDifferentStops: "請選擇不同的起訖站。",
    noDirectTrips: (o: string, d: string) => `目前四條路線都查不到「${o}」到「${d}」的直達班次，請確認站名方向，或改選鄰近的站。`,
    estimatedTag: "(換算估計)",
    fareFull: "全票",
    fareHalf: "半票",
    fareUnknown: "票價請洽車上或官網",
    doneForToday: "今日班次已結束，請參考下方完整時刻表，或改選其他日期。",
    showFullTimetable: (show: boolean, o: string, d: string, n: number) => `${show ? "隱藏" : "顯示"}「${o} → ${d}」完整班次時刻表 (${n} 班)`,

    railDisclaimer1: "阿里山森林鐵路目前每日班次較少，且易受養護工程、天候影響調整或停駛。以下時刻整理自官方公告（2025/1/10 生效版本），僅供行程參考，",
    railDisclaimerStrong: "搭乘前請務必至官方網站或訂票系統確認當日實際班次",
    railUpTitle: "上山（嘉義／北門 → 奮起湖 → 阿里山）",
    railDownTitle: "下山（阿里山／奮起湖 → 北門 → 嘉義）",
    transferTitle: (stop: string) => `搭小火車到奮起湖後，轉乘公車回${stop}`,
    transferNone: "目前查無銜接得上的班次，請改以嘉義縣公車即時動態或計程車接駁。",
    fareRefTitle: "參考票價",
    officialTimetable: "官方時刻表及票價",
    onlineBooking: "線上訂票系統",

    driveBtn: "開車",
    driveModalTitle: "開車前請注意",
    driveCaption1: "請勿走左側嘉130鄉道公田路段(路況不佳)",
    driveCaption2: "勿在57.6K左轉英迪格酒店",
    driveCaption3: "57.9K處左側斜坡往上200公尺即可到達民宿",
    driveModalDirections: "山區不建議使用導航系統，請依國道三號 → 下中埔交流道 → 阿里山公路(台18線)往阿里山方向 → 龍頭 → 57.9km處左上方小路的路線前來。",
    driveModalGo: "知道了，前往 Google 地圖",
    driveModalClose: "關閉",

    eyebrowHowTo: "交通指南",
    eyebrowBus: "即時查詢",
    eyebrowRail: "森林鐵路",
    eyebrowDrive: "自行開車",
    eyebrowContact: "歡迎光臨",
    featureRoutes: "4 條路線可達",
    featureWalk: "下車步行10–15分鐘",
    featureRail: "可轉乘阿里山森林鐵路",

    homeIntroTitle: "請選擇您的交通方式",
    homeCardCta: "查看詳情",

    mapPageTitle: "阿里山全區旅遊地圖",
    mapEmpty: "地圖資料尚未建立，請稍後再回來查看。",
    mapSource: "資料來源：阿里山國家風景區管理處",
    mapZoomClose: "關閉放大檢視",
  },

  "zh-CN": {
    heroKicker: "嘉义・奋起湖・阿里山",
    heroTitle1: "茶香花园民宿",
    heroTitle2: "交通与班次查询",
    heroP1: "茶香花园民宿邻近「龙头站」及「龙头坪站」。您可搭乘台湾好行阿里山线公车、奋起湖线、达邦线公车，或搭乘阿里山森林铁路转乘公车前来。",
    heroP2: "于龙头站或龙头坪站下车后，步行约10～15分钟即可抵达民宿。以下提供即时班次查询，并可依照目前时间协助您确认是否来得及搭乘下一班车。",
    navBus: "搭乘公车",
    navRail: "搭乘主线小火车",
    navDrive: "开车",
    navMap: "阿里山全区旅游地图",
    backHome: "回首页",

    howToTitle: "怎么来民宿",
    driveTitle: "自行开车",
    driveAddressLabel: "地址：",
    driveDirections: "国道三号 → 下中埔交流道 → 沿阿里山公路(台18线)往阿里山方向 → 龙头 → 约抵57.9km处左上方小路约200公尺即可抵达。",
    driveWarning: "⚠ 山区不建议使用导航系统，请勿走嘉130乡道公田路段，也勿在57.6K左转英迪格酒店。",
    driveUpTitle: "从嘉义上山方向",
    driveReturnTitle: "从阿里山、奋起湖、石桌回程下山方向",
    driveVideosLabel: "参考行车指引影片：",
    driveVideo1: "抵达民宿前的影片",
    driveVideo2: "阿里山、奋起湖、石桌、回程方向",
    driveReturnPhoto1Caption: "从阿里山或奋起湖返回民宿的入口",
    driveReturnPhoto2Caption: "斜坡继续往上开约200公尺即可到达民宿",

    busCardTitle: "搭乘公车",
    busCardBody: (stop: string) =>
      `从嘉义火车站或高铁嘉义站搭台湾好行阿里山线公车（A线／B线），或嘉义县公车 7302 奋起湖线、7314 达邦线，都会行经${stop}，下车后民宿就在附近，可事先与我们联系接驳或步行前来。台湾好行班次较密集，奋起湖线、达邦线班次较少但贴近在地生活作息，适合抓准时间搭乘。建议提前10分钟等候。`,

    railCardTitle: "搭阿里山森林铁路",
    railCardBody: (stop: string) =>
      `从嘉义站或北门站搭阿里山森林铁路至「奋起湖」站，再转乘公车下山至${stop}即可抵达；班次较少，建议先订票并确认时间（详见下方转乘资讯）。`,

    busSectionTitle: "公车班次查询",
    busSectionBody: (stop: string) =>
      `选择起讫站即可，系统会自动整合台湾好行阿里山线（A／B线）与 7302 奋起湖线、7314 达邦线四条路线，依现在时间列出接下来可搭乘的班次；已预设迄站为${stop}。`,
    busSectionWarn: (stop: string) =>
      `⚠ 提醒：选单中的「奋起湖」并非每一班 A／B 线公车都停靠（仅少数「经奋起湖」班次），若选「奋起湖」查无班次是正常现象；但${stop}几乎每一班 A／B 线公车都有停靠，查询结果较稳定。`,

    railSectionTitle: "阿里山森林铁路时刻",
    railSectionBody: (stop: string) =>
      `目前每日班次不多，建议事先上网订票并保留较充裕的转乘时间。抵达奋起湖后可转乘台湾好行公车回${stop}（见下方转乘时刻）。`,

    contactTitle: "位置与联络",
    openInMaps: "在 Google 地图上开启",
    footer: "本页班次与票价资料整理自台湾好行阿里山线、嘉义县公共汽车管理处、阿里山林业铁路及文化资产管理处官方公告（整理时间 2026-09-14），实际班次、票价如有调整请以官方公告为准。如发现资料有误或已过时，欢迎与民宿联系告知，我们会尽快更新。",

    finderIntro: "自动整合台湾好行阿里山线（A／B线）与 7302 奋起湖线、7314 达邦线四条路线；选今天可依现在时间列出接下来可搭乘的班次，选其他日期则列出当天全部班次。",
    originLabel: "起站",
    destLabel: "迄站",
    swapAria: "交换起讫站",
    dateLabel: "搭乘日期",
    nowLabelPrefix: "现在台湾时间",
    showingToday: "（显示今天接下来可搭乘的班次）",
    showingOtherDate: (date: string, weekend: boolean) => `（显示 ${date} 全天班次，${weekend ? "假日班表" : "平日班表"}）`,
    pickDifferentStops: "请选择不同的起讫站。",
    noDirectTrips: (o: string, d: string) => `目前四条路线都查不到「${o}」到「${d}」的直达班次，请确认站名方向，或改选邻近的站。`,
    estimatedTag: "(换算估计)",
    fareFull: "全票",
    fareHalf: "半票",
    fareUnknown: "票价请洽车上或官网",
    doneForToday: "今日班次已结束，请参考下方完整时刻表，或改选其他日期。",
    showFullTimetable: (show: boolean, o: string, d: string, n: number) => `${show ? "隐藏" : "显示"}「${o} → ${d}」完整班次时刻表 (${n} 班)`,

    railDisclaimer1: "阿里山森林铁路目前每日班次较少，且易受养护工程、天候影响调整或停驶。以下时刻整理自官方公告（2025/1/10 生效版本），仅供行程参考，",
    railDisclaimerStrong: "搭乘前请务必至官方网站或订票系统确认当日实际班次",
    railUpTitle: "上山（嘉义／北门 → 奋起湖 → 阿里山）",
    railDownTitle: "下山（阿里山／奋起湖 → 北门 → 嘉义）",
    transferTitle: (stop: string) => `搭小火车到奋起湖后，转乘公车回${stop}`,
    transferNone: "目前查无衔接得上的班次，请改以嘉义县公车即时动态或计程车接驳。",
    fareRefTitle: "参考票价",
    officialTimetable: "官方时刻表及票价",
    onlineBooking: "线上订票系统",

    driveBtn: "开车",
    driveModalTitle: "开车前请注意",
    driveCaption1: "请勿走左侧嘉130乡道公田路段(路况不佳)",
    driveCaption2: "勿在57.6K左转英迪格酒店",
    driveCaption3: "57.9K处左侧斜坡往上200公尺即可到达民宿",
    driveModalDirections: "山区不建议使用导航系统，请依国道三号 → 下中埔交流道 → 阿里山公路(台18线)往阿里山方向 → 龙头 → 57.9km处左上方小路的路线前来。",
    driveModalGo: "知道了，前往 Google 地图",
    driveModalClose: "关闭",

    eyebrowHowTo: "交通指南",
    eyebrowBus: "即时查询",
    eyebrowRail: "森林铁路",
    eyebrowDrive: "自行开车",
    eyebrowContact: "欢迎光临",
    featureRoutes: "4 条路线可达",
    featureWalk: "下车步行10–15分钟",
    featureRail: "可转乘阿里山森林铁路",

    homeIntroTitle: "请选择您的交通方式",
    homeCardCta: "查看详情",

    mapPageTitle: "阿里山全区旅游地图",
    mapEmpty: "地图资料尚未建立，请稍后再回来查看。",
    mapSource: "资料来源：阿里山国家风景区管理处",
    mapZoomClose: "关闭放大检视",
  },

  en: {
    heroKicker: "Chiayi · Fenqihu · Alishan",
    heroTitle1: "Tea Garden B&B",
    heroTitle2: "Transit & Schedule Finder",
    heroP1:
      `Tea Garden B&B is near "Longtou Station" and "Longtouping Station." You can get here by Taiwan Tourist Shuttle Alishan bus, local Chiayi County buses (Fenqihu Line / Dabang Line), or the Alishan Forest Railway plus a connecting bus.`,
    heroP2: "After getting off at Longtou Station or Longtouping Station, it's about a 10–15 minute walk to the B&B. Below you'll find a live schedule finder that checks whether you can still catch the next departure.",
    navBus: "Take the Bus",
    navRail: "Take the Main-Line Train",
    navDrive: "Driving",
    navMap: "Alishan Area Tourist Map",
    backHome: "Back to Home",

    howToTitle: "How to Get Here",
    driveTitle: "Driving",
    driveAddressLabel: "Address: ",
    driveDirections: "National Freeway No.3 → Zhongpu Interchange → Alishan Highway (Route 18) toward Alishan → Longtou → at about the 57.9km mark, a small road on the upper-left leads ~200m to the B&B.",
    driveWarning: "⚠ GPS navigation is not recommended in this mountain area. Do not take County Road Jia-130 through Gongtian, and do not turn left into Hotel Indigo at the 57.6K mark.",
    driveUpTitle: "Uphill Route from Chiayi",
    driveReturnTitle: "Downhill Return Route from Alishan / Fenqihu / Shizhuo",
    driveVideosLabel: "Reference driving guide videos:",
    driveVideo1: "Video: approaching the B&B",
    driveVideo2: "Alishan / Fenqihu / Shizhuo / return route",
    driveReturnPhoto1Caption: "The entrance to the B&B when returning from Alishan or Fenqihu",
    driveReturnPhoto2Caption: "Continue up the slope about 200m to reach the B&B",

    busCardTitle: "Take the Bus",
    busCardBody: (stop: string) =>
      `From Chiayi Railway Station or THSR Chiayi Station, take the Taiwan Tourist Shuttle Alishan Bus (Route A or B), or Chiayi County Bus Route 7302 Fenqihu Line or 7314 Dabang Line — all pass through ${stop}. The B&B is nearby after you get off; contact us ahead for a pickup, or walk over. The Tourist Shuttle runs more frequently, while the Fenqihu and Dabang Lines run less often but follow local schedules — plan your timing. We recommend arriving 10 minutes early.`,

    railCardTitle: "Take the Alishan Forest Railway",
    railCardBody: (stop: string) =>
      `Take the Alishan Forest Railway from Chiayi Station or Beimen Station to "Fenqihu" Station, then transfer to a bus heading downhill to ${stop} to reach the B&B. Departures are infrequent — book tickets ahead and check timing (see the transfer info below).`,

    busSectionTitle: "Bus Schedule Finder",
    busSectionBody: (stop: string) =>
      `Just pick your origin and destination — the system automatically combines the Taiwan Tourist Shuttle Alishan Bus (Routes A/B) with the 7302 Fenqihu Line and 7314 Dabang Line and lists the next departures based on the current time. The destination defaults to ${stop}.`,
    busSectionWarn: (stop: string) =>
      `⚠ Note: not every Route A/B bus stops at "Fenqihu" in the dropdown (only a few "via Fenqihu" departures do) — no results there is normal. But almost every Route A/B bus stops at ${stop}, so results are more consistent.`,

    railSectionTitle: "Alishan Forest Railway Schedule",
    railSectionBody: (stop: string) =>
      `Departures are currently infrequent — book online in advance and allow extra time for transfers. After arriving at Fenqihu, you can transfer to a Tourist Shuttle bus back to ${stop} (see the transfer schedule below).`,

    contactTitle: "Location & Contact",
    openInMaps: "Open in Google Maps",
    footer: "Schedule and fare information on this page is compiled from official announcements by the Taiwan Tourist Shuttle Alishan Line, Chiayi County Bus Administration, and the Alishan Forest Railway and Cultural Heritage Office (compiled 2026-09-14). Actual schedules and fares are subject to official updates. If you notice anything outdated or incorrect, please let us know and we'll update it promptly.",

    finderIntro: "Automatically combines the Taiwan Tourist Shuttle Alishan Line (Routes A/B) with the 7302 Fenqihu Line and 7314 Dabang Line. Pick today to see upcoming departures based on the current time, or pick another date to see the full day's schedule.",
    originLabel: "From",
    destLabel: "To",
    swapAria: "Swap origin and destination",
    dateLabel: "Travel date",
    nowLabelPrefix: "Current time in Taiwan",
    showingToday: "(Showing upcoming departures for today)",
    showingOtherDate: (date: string, weekend: boolean) => `(Showing the full schedule for ${date}, ${weekend ? "weekend/holiday timetable" : "weekday timetable"})`,
    pickDifferentStops: "Please choose two different stops.",
    noDirectTrips: (o: string, d: string) => `None of the four routes currently show a direct trip from "${o}" to "${d}". Check the direction, or try a nearby stop.`,
    estimatedTag: "(estimated)",
    fareFull: "Full fare",
    fareHalf: "Half fare",
    fareUnknown: "Ask on board or check the official site",
    doneForToday: "No more departures today — see the full timetable below, or pick another date.",
    showFullTimetable: (show: boolean, o: string, d: string, n: number) => `${show ? "Hide" : "Show"} the full timetable for "${o} → ${d}" (${n} trips)`,

    railDisclaimer1: "The Alishan Forest Railway currently runs few daily departures and is subject to change or suspension due to maintenance or weather. The schedule below is compiled from the official announcement (effective 2025/1/10) for reference only —",
    railDisclaimerStrong: "please confirm the actual schedule on the official website or booking system before you travel",
    railUpTitle: "Uphill (Chiayi/Beimen → Fenqihu → Alishan)",
    railDownTitle: "Downhill (Alishan/Fenqihu → Beimen → Chiayi)",
    transferTitle: (stop: string) => `Taking the train to Fenqihu? Transfer to a bus back to ${stop}`,
    transferNone: "No connecting departures found right now — please use Chiayi County Bus real-time tracking or a taxi transfer instead.",
    fareRefTitle: "Reference Fares",
    officialTimetable: "Official timetable & fares",
    onlineBooking: "Online booking system",

    driveBtn: "Driving",
    driveModalTitle: "Before You Drive",
    driveCaption1: "Do not take County Road Jia-130 through Gongtian (poor road conditions)",
    driveCaption2: "Do not turn left into Hotel Indigo at 57.6K",
    driveCaption3: "At 57.9K, take the slope on the left uphill ~200m to reach the B&B",
    driveModalDirections: "GPS navigation is not recommended in this mountain area. Please follow: National Freeway No.3 → Zhongpu Interchange → Alishan Highway (Route 18) toward Alishan → Longtou → the small road on the upper-left at about 57.9km.",
    driveModalGo: "Got it, open Google Maps",
    driveModalClose: "Close",

    eyebrowHowTo: "Getting Here",
    eyebrowBus: "Live Lookup",
    eyebrowRail: "Forest Railway",
    eyebrowDrive: "Driving",
    eyebrowContact: "Welcome",
    featureRoutes: "4 routes reach the B&B",
    featureWalk: "10–15 min walk from the stop",
    featureRail: "Forest Railway transfer available",

    homeIntroTitle: "Choose how you're getting here",
    homeCardCta: "View details",

    mapPageTitle: "Alishan Area Tourist Map",
    mapEmpty: "Map data hasn't been published yet — please check back later.",
    mapSource: "Source: Alishan National Scenic Area Administration",
    mapZoomClose: "Close zoomed view",
  },
};
