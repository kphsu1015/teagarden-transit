import { Lang } from "./i18n";

export const MAP_URL = "https://maps.app.goo.gl/DZJ5KF8J9UqY6Dud8";

const ADDRESS_ZH = "嘉義縣番路鄉公田村龍頭9號";
const ADDRESS_SC = "嘉义县番路乡公田村龙头9号";
const ADDRESS_EN = "No. 9, Longtou, Gongtian Village, Fanlu Township, Chiayi County, Taiwan";

export const ADDRESS: Record<Lang, string> = { zh: ADDRESS_ZH, "zh-CN": ADDRESS_SC, en: ADDRESS_EN };

// 交通小幫手在 OpenAI 無法使用時會顯示這個連結做為備援聯絡方式。
// 會被瀏覽器端（LINE 聯絡按鈕）讀取，故使用 NEXT_PUBLIC_ 前綴的環境變數（見 .env.example）；
// 後面的固定網址是目前的備援預設值，若環境變數未設定也不會顯示無效連結。
export const LINE_CONTACT_URL = process.env.NEXT_PUBLIC_LINE_CONTACT_URL || "https://line.me/R/ti/p/@ali-home";
