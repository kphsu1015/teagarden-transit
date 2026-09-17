// 交通小幫手專用的台灣時間工具。所有日期/時間運算一律以 Asia/Taipei 為準，
// 不可使用伺服器預設時區（Vercel 等平台預設 UTC，跨日時容易算錯）。

export interface TaipeiNow {
  dateISO: string; // YYYY-MM-DD
  timeHHMM: string; // HH:mm
  minutes: number; // 當天 0:00 起算的分鐘數
}

export function getTaipeiNow(): TaipeiNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const h = Number(get("hour"));
  const m = Number(get("minute"));
  return {
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
    timeHHMM: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    minutes: h * 60 + m,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function isValidDateISO(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTimeHHMM(s: unknown): s is string {
  if (typeof s !== "string" || !TIME_RE.test(s)) return false;
  const [h, m] = s.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// 台灣全年不使用日光節約時間，固定 UTC+8，可以安全地用一個常數位移換算絕對時間點
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * 把「台灣當地日期 + 時間」換算成絕對時間點（epoch ms）。
 * 用來正確比較「不同日期」的班次時間，不能只拿 HH:mm 字串互相比較 —— 那樣會分不出
 * 「今天 19:00」和「明天 09:00」誰先誰後，也踩不到跨月、跨年的邊界。
 */
export function taipeiToEpochMs(dateISO: string, hhmm: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return Date.UTC(y, m - 1, d, h, min, 0) - TAIPEI_OFFSET_MS;
}

/** 除錯用：台灣當地日期+時間 -> 帶時區位移的 ISO 字串，例如 2026-09-17T09:00:00+08:00 */
export function taipeiToIsoString(dateISO: string, hhmm: string): string {
  return `${dateISO}T${hhmm}:00+08:00`;
}

/** 絕對時間點 -> 台灣當地 HH:mm，用於把搜尋時間窗換回可讀文字（例如時段查詢的上下限） */
export function epochMsToTaipeiHHMM(epochMs: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epochMs));
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

/** 除錯用：絕對時間點 -> 台灣當地帶時區位移的 ISO 字串，例如 2026-09-17T09:00:00+08:00 */
export function epochMsToTaipeiIsoString(epochMs: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epochMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+08:00`;
}

export type TimePeriod = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

/** 時段對應的起訖時間（皆為台灣當地時間） */
export const TIME_PERIOD_RANGES: Record<TimePeriod, { start: string; end: string }> = {
  dawn: { start: "04:00", end: "07:00" },
  morning: { start: "06:00", end: "12:00" },
  noon: { start: "11:00", end: "14:00" },
  afternoon: { start: "12:00", end: "18:00" },
  evening: { start: "16:00", end: "19:00" },
  night: { start: "18:00", end: "23:59" },
};

const VALID_TIME_PERIODS: TimePeriod[] = ["dawn", "morning", "noon", "afternoon", "evening", "night"];

export function isValidTimePeriod(s: unknown): s is TimePeriod {
  return typeof s === "string" && (VALID_TIME_PERIODS as string[]).includes(s);
}
