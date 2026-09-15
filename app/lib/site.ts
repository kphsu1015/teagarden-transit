import { Lang } from "./i18n";

export const MAP_URL = "https://maps.app.goo.gl/DZJ5KF8J9UqY6Dud8";

const ADDRESS_ZH = "嘉義縣番路鄉公田村龍頭9號";
const ADDRESS_SC = "嘉义县番路乡公田村龙头9号";
const ADDRESS_EN = "No. 9, Longtou, Gongtian Village, Fanlu Township, Chiayi County, Taiwan";

export const ADDRESS: Record<Lang, string> = { zh: ADDRESS_ZH, "zh-CN": ADDRESS_SC, en: ADDRESS_EN };
