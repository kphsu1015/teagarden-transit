// 把 route-planner 算好的結果，整理成旅客看得懂的自然語言。
// 全部使用固定樣板字串（依語言選字），OpenAI 不參與這一步，
// 確保班次、時間、站名、交通方式等事實資訊 100% 來自程式計算，不會被模型改寫或臆測。
// 語氣刻意寫成民宿櫃檯人員在為房客親自說明，不是制式的系統訊息或聊天機器人語氣。

import type { Lang } from "../i18n";
import { stopName, routeLabelText } from "../i18n";
import { HOMESTAY_STOP } from "../bus-data";
import type { PlanResult, MultiLegPlanResult } from "./route-planner";
import type { Preference } from "./openai-parser";
import type { ScheduledMode, ModedTrip } from "./transport";
import { epochMsToTaipeiHHMM } from "./taipei-time";
import { CHARTER_DRIVERS } from "./drivers";

const DISCLAIMER: Record<Lang, string> = {
  zh: "班次及票價偶爾會臨時調整，正確資訊仍請以交通單位官方公告為準，請多包涵。",
  "zh-CN": "班次及票价偶尔会临时调整，正确信息仍请以交通单位官方公告为准，请多包涵。",
  en: "Just a heads-up that schedules and fares can change without notice — please double-check with the official transit authority before you head out.",
};

const PICKUP_REMINDER: Record<Lang, string> = {
  zh: "如果需要民宿接送，麻煩提前一天告訴我們您搭乘的班次，我們會盡量幫您安排喔。",
  "zh-CN": "如果需要民宿接送，麻烦提前一天告诉我们您搭乘的班次，我们会尽量帮您安排哦。",
  en: "If you'd like us to pick you up, just let us know the day before which departure you're on and we'll do our best to arrange it.",
};

const WALK_NOTE: Record<Lang, string> = {
  zh: "在龍頭站或龍頭坪站下車後，沿路步行約10～15分鐘就能到我們民宿囉，路上風景很不錯。",
  "zh-CN": "在龙头站或龙头坪站下车后，沿路步行约10～15分钟就能到我们民宿啰，路上风景很不错。",
  en: "Once you get off at Longtou Station or Longtouping Station, it's about a 10–15 minute walk to reach us — a nice stroll with good views along the way.",
};

const LUGGAGE_NOTE: Record<Lang, string> = {
  zh: "另外提醒您，公車車廂空間比較有限，人數或行李較多的話，建議提早到站集中放置行李；如果覺得不方便，也歡迎跟我們討論包車或接送的安排。",
  "zh-CN": "另外提醒您，公车车厢空间比较有限，人数或行李较多的话，建议提早到站集中放置行李；如果觉得不方便，也欢迎跟我们讨论包车或接送的安排。",
  en: "One more thing — bus luggage space is a bit limited, so with a larger group or more bags, it helps to arrive a little early and keep everything together. Happy to discuss a private charter or pickup instead if that's more comfortable.",
};

const MODE_EMOJI: Record<ScheduledMode | "drive" | "taxi", string> = {
  train: "🚆",
  bus: "🚌",
  drive: "🚗",
  taxi: "🚕",
};

const MODE_LABEL: Record<ScheduledMode | "drive" | "taxi", Record<Lang, string>> = {
  train: { zh: "森林鐵路", "zh-CN": "森林铁路", en: "Forest Railway" },
  bus: { zh: "公車", "zh-CN": "公车", en: "bus" },
  drive: { zh: "自行開車", "zh-CN": "自行开车", en: "driving" },
  taxi: { zh: "包車／計程車", "zh-CN": "包车／计程车", en: "private charter/taxi" },
};

function modeTag(mode: ScheduledMode | "drive" | "taxi", lang: Lang): string {
  return `${MODE_EMOJI[mode]} ${MODE_LABEL[mode][lang]}`;
}

function fmtMinutes(min: number, lang: Lang): string {
  if (lang === "en") {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
  }
  if (min < 60) return `${min} 分鐘`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分鐘`;
}

function waitLabel(waitMinutes: number, lang: Lang): string {
  if (waitMinutes <= 0) {
    return lang === "en"
      ? "This one's about to leave, so you'll want to head to the stop right away!"
      : lang === "zh-CN"
        ? "这班车马上就要发车了，麻烦您尽快前往上车地点喔！"
        : "這班車馬上就要發車了，麻煩您盡快前往上車地點喔！";
  }
  const m = fmtMinutes(waitMinutes, lang);
  if (lang === "en") return `You've got about ${m} before it leaves, so there's no need to rush.`;
  if (lang === "zh-CN") return `距离发车还有约 ${m}，时间上很充裕，不用担心。`;
  return `距離發車還有約 ${m}，時間上很充裕，不用擔心。`;
}

function sn(key: string, lang: Lang): string {
  return stopName(key, lang);
}

/** 有真的抵達時間就顯示，沒有的話清楚寫「尚無法確認」，不會用換算估計去製造一個未經資料確認的時間 */
function arriveLabel(trip: ModedTrip, lang: Lang): string {
  if (!trip.arriveTime) {
    return lang === "en" ? "we can't confirm the exact arrival time yet" : lang === "zh-CN" ? "抵达时间目前还无法确认" : "抵達時間目前還無法確認";
  }
  const estTag = trip.estimated ? (lang === "en" ? " (estimated)" : lang === "zh-CN" ? "（换算估计）" : "（換算估計）") : "";
  return `${trip.arriveTime}${estTag}`;
}

/** 每一筆行程都附上「今天末班車幾點」，讓旅客安排時間時心裡有數 */
function lastBusLine(plan: PlanResult, lang: Lang): string | null {
  if (!plan.lastTripOfDay) return null;
  const t = plan.lastTripOfDay;
  const tag = modeTag(t.mode, lang);
  if (lang === "en") return `For reference, today's last ${tag} departure is at ${t.departTime}.`;
  if (lang === "zh-CN") return `提醒您，今天最后一班${tag}是 ${t.departTime} 发车，请留意时间。`;
  return `提醒您，今天最後一班${tag}是 ${t.departTime} 發車，請留意時間喔。`;
}

/** no_route / missed_last / outside_period 這幾種「這段查不到可搭的車」情況的說明文字，單段、多段行程共用 */
function blockedReason(fromName: string, toName: string, plan: PlanResult, lang: Lang): string {
  const { status, dateISO } = plan;
  if (status === "missed_last") {
    const lastTime = plan.lastTripOfDay?.departTime;
    if (lastTime) {
      return lang === "en"
        ? `I'm sorry, today's last departure from ${fromName} to ${toName} was already at ${lastTime}, so we've missed it for ${dateISO}.`
        : lang === "zh-CN"
          ? `不好意思，${dateISO} 从${fromName}到${toName}的末班车是 ${lastTime} 发车，已经过了这个时间了。`
          : `不好意思，${dateISO} 從${fromName}到${toName}的末班車是 ${lastTime} 發車，已經過了這個時間了。`;
    }
    return lang === "en"
      ? `I'm sorry, it looks like today's last departure from ${fromName} to ${toName} has already gone.`
      : lang === "zh-CN"
        ? `不好意思，${dateISO} 从${fromName}到${toName}的班次今天已经发车完毕了。`
        : `不好意思，${dateISO} 從${fromName}到${toName}的班次今天已經發車完畢了。`;
  }
  if (status === "outside_period") {
    const startLabel = epochMsToTaipeiHHMM(plan.window.lowerEpochMs);
    const endLabel = plan.window.upperEpochMs != null ? epochMsToTaipeiHHMM(plan.window.upperEpochMs) : null;
    const rangeLabel = endLabel ? `${startLabel}–${endLabel}` : startLabel;
    return lang === "en"
      ? `I'm sorry, there's no departure from ${fromName} to ${toName} on ${dateISO} within ${rangeLabel} — there may still be something at another time that day.`
      : lang === "zh-CN"
        ? `不好意思，${dateISO} 从${fromName}到${toName}，在您希望的时段（${rangeLabel}）内没有符合的班次；当天其他时段可能还有机会。`
        : `不好意思，${dateISO} 從${fromName}到${toName}，在您希望的時段（${rangeLabel}）內沒有符合的班次；當天其他時段可能還有機會。`;
  }
  return lang === "en"
    ? `I'm sorry, we don't have a direct route from ${fromName} to ${toName} in our current schedule information.`
    : lang === "zh-CN"
      ? `不好意思，目前的班次资料查不到从${fromName}到${toName}的直达路线。`
      : `不好意思，目前的班次資料查不到從${fromName}到${toName}的直達路線。`;
}

function contactAdviceLine(lang: Lang): string {
  return lang === "en"
    ? "Please reach out to us directly and we'll help you sort out a private charter or another way to get here — we'd rather not guess at a schedule we can't confirm."
    : lang === "zh-CN"
      ? "建议您直接与民宿联系，我们协助您确认包车或其他交通方式，没有把握的班次我们不会随意猜测给您。"
      : "建議您直接與民宿聯繫，我們協助您確認包車或其他交通方式，沒有把握的班次我們不會隨意猜測給您。";
}

/** 完全查不到班次時，主動問旅客要不要看在地包車司機的聯絡方式（是/否） */
export function driverOfferQuestion(lang: Lang): string {
  return lang === "en"
    ? "Would you like us to share the contact details of a local charter driver instead? (yes / no)"
    : lang === "zh-CN"
      ? "要不要我们提供在地包车司机的联络方式给您呢？（是／否）"
      : "要不要我們提供在地包車司機的聯絡方式給您呢？（是／否）";
}

/** 旅客同意之後，把司機聯絡資訊原樣輸出（固定事實資料，不經過模型改寫） */
export function buildDriverContactAnswer(lang: Lang): string {
  const intro =
    lang === "en"
      ? "Of course! Here are the local charter drivers' contact details:"
      : lang === "zh-CN"
        ? "好的，为您提供以下包车司机的联络方式："
        : "好的，為您提供以下包車司機的聯絡方式：";

  const blocks = CHARTER_DRIVERS.map((d) => {
    const lines = [`${d.name}（${d.area}）`, `📞 ${lang === "en" ? "Phone" : lang === "zh-CN" ? "电话" : "電話"}：${d.phone}`];
    if (d.lineId) lines.push(`💬 LINE ID：${d.lineId}`);
    if (d.whatsapp) lines.push(`📱 WhatsApp：${d.whatsapp}`);
    return lines.join("\n");
  });

  const note =
    lang === "en"
      ? "Please note: the B&B is only passing along this contact information — for pricing, please confirm directly with the driver."
      : lang === "zh-CN"
        ? "民宿只代为提供联络资讯，报价请直接跟司机确认。"
        : "民宿只代為提供聯絡資訊，報價請直接跟司機確認。";

  return [intro, ...blocks, note].join("\n\n");
}

export function buildDriverDeclineAnswer(lang: Lang): string {
  return lang === "en"
    ? "No problem at all! Just let us know if you change your mind later."
    : lang === "zh-CN"
      ? "好的，没问题！之后有需要的话随时再告诉我们喔。"
      : "好的，沒問題！之後有需要的話隨時再告訴我們喔。";
}

/** 自行開車／包車計程車：沒有固定時刻表資料，給資訊性回覆，不查班次也不假裝有時刻表 */
function buildNoScheduleModeAnswer(lang: Lang, plan: PlanResult): string {
  const tag = modeTag(plan.requestedMode as "drive" | "taxi", lang);

  if (plan.requestedMode === "drive") {
    return lang === "en"
      ? `${tag} doesn't come with a fixed schedule to check — please take a look at the Driving page on our site, it has detailed directions for you.`
      : lang === "zh-CN"
        ? `${tag}的部分没有固定时刻表可以查询，建议您参考网站上「开车」页面，里面有詳細的路线指引喔。`
        : `${tag}的部分沒有固定時刻表可以查詢，建議您參考網站上「開車」頁面，裡面有詳細的路線指引喔。`;
  }

  // taxi/charter：這正是包車司機聯絡方式派上用場的情境，直接問旅客要不要看
  const line =
    lang === "en"
      ? `${tag} doesn't have fixed pricing on our end.`
      : lang === "zh-CN"
        ? `${tag}的部分我们没有固定价格资讯。`
        : `${tag}的部分我們沒有固定價格資訊。`;
  return [line, driverOfferQuestion(lang)].join("\n\n");
}

/**
 * 指定的交通方式（火車或公車其中一種）在條件內查不到班次，但另一種確實有資料可用：
 * 誠實告知「沒有符合的班次＋最接近的班次」，然後詢問是否願意改搭其他交通方式 —— 絕不擅自替換。
 */
function buildModeOfferAnswer(lang: Lang, plan: PlanResult): string {
  const originName = sn(plan.originKey, lang);
  const destName = sn(plan.destKey, lang);
  const requestedTag = modeTag(plan.requestedMode as ScheduledMode, lang);
  const requestedLabel = MODE_LABEL[plan.requestedMode as ScheduledMode][lang];
  const requestedTimeLabel = epochMsToTaipeiHHMM(plan.window.lowerEpochMs);
  const lines: string[] = [];

  if (plan.closestModeTrips.length > 0) {
    const times = plan.closestModeTrips.map((t) => t.departTime).join(lang === "en" ? " or " : "或");
    lines.push(
      lang === "en"
        ? `I'm sorry, there's no ${requestedLabel} leaving ${originName} at ${requestedTimeLabel} — the closest ${requestedLabel} option${plan.closestModeTrips.length > 1 ? "s would be" : " would be"} ${times}.`
        : lang === "zh-CN"
          ? `不好意思，${requestedTimeLabel}没有从${originName}出发的${requestedTag}班次呢，最接近的是${times}。`
          : `不好意思，${requestedTimeLabel}沒有從${originName}出發的${requestedTag}班次呢，最接近的是${times}。`
    );
  } else {
    lines.push(
      lang === "en"
        ? `I'm sorry, we don't have a ${requestedLabel} route from ${originName} to ${destName} in our schedule information.`
        : lang === "zh-CN"
          ? `不好意思，目前的资料查不到从${originName}到${destName}的${requestedTag}路线呢。`
          : `不好意思，目前的資料查不到從${originName}到${destName}的${requestedTag}路線呢。`
    );
  }

  if (plan.alternativeMode) {
    const altTag = modeTag(plan.alternativeMode, lang);
    lines.push(
      lang === "en"
        ? `Would it work for you if we checked ${altTag} options instead? Happy to help with that.`
        : lang === "zh-CN"
          ? `方便的话，要不要改看看${altTag}的班次呢？我们也可以协助您安排。`
          : `方便的話，要不要改看看${altTag}的班次呢？我們也可以協助您安排。`
    );
  } else {
    // 連另一種交通方式都沒有資料可查了，這才是真的完全沒有班次，改問要不要提供包車司機聯絡方式
    lines.push(driverOfferQuestion(lang));
  }

  return lines.join("\n\n");
}

export interface AnswerContext {
  lang: Lang;
  plan: PlanResult;
  mentionedLongtouping: boolean;
  preference: Preference;
  passengers: number | null;
  largeLuggage: boolean | null;
}

export function buildAnswer(ctx: AnswerContext): string {
  const { lang, plan } = ctx;
  const lines: string[] = [];

  if (plan.status === "same_place") {
    lines.push(
      lang === "en"
        ? "It looks like your starting point and destination are the same place — could you let us know where you're heading from and to?"
        : lang === "zh-CN"
          ? "您好，您输入的出发地和目的地是同一个地方呢，麻烦您重新告诉我们想从哪里到哪里喔。"
          : "您好，您輸入的出發地和目的地是同一個地方呢，麻煩您重新告訴我們想從哪裡到哪裡喔。"
    );
    return lines.join("\n\n") + "\n\n" + DISCLAIMER[lang];
  }

  if (plan.status === "no_schedule_mode") {
    return buildNoScheduleModeAnswer(lang, plan) + "\n\n" + DISCLAIMER[lang];
  }

  if (plan.status === "mode_unavailable_offer_alternative") {
    return buildModeOfferAnswer(lang, plan) + "\n\n" + DISCLAIMER[lang];
  }

  const originName = sn(plan.originKey, lang);
  const destName = sn(plan.destKey, lang);

  if (plan.status === "no_route" || plan.status === "missed_last" || plan.status === "outside_period") {
    lines.push(blockedReason(originName, destName, plan, lang));
    lines.push(driverOfferQuestion(lang));
    if (plan.arrivesAtHomestayStop) lines.push(WALK_NOTE[lang]);
    if (ctx.mentionedLongtouping) lines.push(PICKUP_REMINDER[lang]);
    return lines.join("\n\n") + "\n\n" + DISCLAIMER[lang];
  }

  // status === "ok"
  const trip = plan.nextTrip!;
  const route = `${modeTag(trip.mode, lang)}｜${routeLabelText(trip.routeLabel, lang)}`;
  const arrive = arriveLabel(trip, lang);

  if (lang === "en") {
    lines.push(`We'd suggest taking the ${route} for you.`);
    lines.push(`Please board at ${originName} — the next departure is at ${trip.departTime}.`);
    lines.push(`You'll get off at ${destName}, and ${arrive}.`);
    lines.push("It's a direct route, so there's no need to transfer.");
    if (plan.isToday && plan.waitMinutes != null) {
      lines.push(waitLabel(plan.waitMinutes, lang));
    }
  } else if (lang === "zh-CN") {
    lines.push(`为您安排的交通方式是 ${route}。`);
    lines.push(`请在${originName}搭车，最近一班是 ${trip.departTime} 出发喔。`);
    lines.push(`到${destName}下车，${arrive}。`);
    lines.push("这班是直达车，不用转乘，很方便。");
    if (plan.isToday && plan.waitMinutes != null) {
      lines.push(waitLabel(plan.waitMinutes, lang));
    }
  } else {
    lines.push(`為您安排的交通方式是 ${route}。`);
    lines.push(`請在${originName}搭車，最近一班是 ${trip.departTime} 出發喔。`);
    lines.push(`到${destName}下車，${arrive}。`);
    lines.push("這班是直達車，不用轉乘，很方便。");
    if (plan.isToday && plan.waitMinutes != null) {
      lines.push(waitLabel(plan.waitMinutes, lang));
    }
  }

  if (trip.fareFull != null && trip.cardFareFull != null) {
    lines.push(
      lang === "en"
        ? `Fares: cash NT$${trip.fareFull} full / NT$${trip.fareHalf} concession; by card (EasyCard etc.) NT$${trip.cardFareFull} full / NT$${trip.cardFareHalf} concession.`
        : lang === "zh-CN"
          ? `票价方面，现金全票 NT$${trip.fareFull}、半票 NT$${trip.fareHalf}；刷卡（悠游卡等）全票 NT$${trip.cardFareFull}、半票 NT$${trip.cardFareHalf}，提供您参考。`
          : `票價方面，現金全票 NT$${trip.fareFull}、半票 NT$${trip.fareHalf}；刷卡（悠遊卡等）全票 NT$${trip.cardFareFull}、半票 NT$${trip.cardFareHalf}，提供您參考。`
    );
  } else if (trip.fareFull != null) {
    lines.push(
      lang === "en"
        ? `The fare is NT$${trip.fareFull} for a full ticket, or NT$${trip.fareHalf} for a concession ticket.`
        : lang === "zh-CN"
          ? `票价方面，全票 NT$${trip.fareFull}、半票 NT$${trip.fareHalf}，提供您参考。`
          : `票價方面，全票 NT$${trip.fareFull}、半票 NT$${trip.fareHalf}，提供您參考。`
    );
  }

  if (plan.moreTrips.length > 0) {
    const more = plan.moreTrips.map((t) => `${modeTag(t.mode, lang)} ${routeLabelText(t.routeLabel, lang)} ${t.departTime}`).join("、");
    lines.push(
      lang === "en"
        ? `If that one doesn't work out, there are also later departures: ${more}.`
        : lang === "zh-CN"
          ? `如果这班赶不上，之后还有：${more}。`
          : `如果這班趕不上，之後還有：${more}。`
    );
  }

  const lastLine = lastBusLine(plan, lang);
  if (lastLine) lines.push(lastLine);

  if (plan.destKey === HOMESTAY_STOP) lines.push(WALK_NOTE[lang]);
  if (ctx.mentionedLongtouping) lines.push(PICKUP_REMINDER[lang]);

  if (trip.mode === "bus" && (ctx.preference === "charter" || ctx.largeLuggage || (ctx.passengers != null && ctx.passengers >= 4))) {
    lines.push(LUGGAGE_NOTE[lang]);
  }

  return lines.filter(Boolean).join("\n\n") + "\n\n" + DISCLAIMER[lang];
}

export interface MultiLegAnswerContext {
  lang: Lang;
  multi: MultiLegPlanResult;
  mentionedLongtouping: boolean;
}

function legLabel(n: number, lang: Lang): string {
  if (lang === "en") return `Leg ${n}`;
  return `第 ${n} 段`;
}

/** 多段行程（有中途點）版本的回覆組字，邏輯與 buildAnswer 相同但逐段列出，卡住就誠實停在那一段 */
export function buildMultiLegAnswer(ctx: MultiLegAnswerContext): string {
  const { lang, multi } = ctx;
  const lines: string[] = [];

  multi.legs.forEach((leg, i) => {
    const n = i + 1;
    const fromName = sn(leg.fromKey, lang);
    const toName = sn(leg.toKey, lang);

    if (leg.plan.status === "ok") {
      const trip = leg.plan.nextTrip!;
      const route = `${modeTag(trip.mode, lang)}｜${routeLabelText(trip.routeLabel, lang)}`;
      const arrive = arriveLabel(trip, lang);
      const last = leg.plan.lastTripOfDay && leg.plan.lastTripOfDay.departTime !== trip.departTime ? leg.plan.lastTripOfDay.departTime : null;
      if (lang === "en") {
        lines.push(
          `${legLabel(n, lang)}: ${fromName} → ${toName} — ${route}, departing ${trip.departTime}, arriving ${arrive}.` +
            (last ? ` (Today's last departure for this leg is ${last}.)` : "")
        );
      } else if (lang === "zh-CN") {
        lines.push(
          `${legLabel(n, lang)}：${fromName} → ${toName}｜${route}，发车 ${trip.departTime}，抵达 ${arrive}。` +
            (last ? `（这段今天末班车是 ${last}）` : "")
        );
      } else {
        lines.push(
          `${legLabel(n, lang)}：${fromName} → ${toName}｜${route}，發車 ${trip.departTime}，抵達 ${arrive}。` +
            (last ? `（這段今天末班車是 ${last}）` : "")
        );
      }
    } else if (leg.plan.status === "same_place") {
      lines.push(
        lang === "en"
          ? `${legLabel(n, lang)}: ${fromName} and ${toName} look like the same place — could you double-check this part of the trip?`
          : lang === "zh-CN"
            ? `${legLabel(n, lang)}：${fromName}和${toName}是同一个地点呢，麻烦确认一下这段行程安排。`
            : `${legLabel(n, lang)}：${fromName}和${toName}是同一個地點呢，麻煩確認一下這段行程安排。`
      );
    } else if (leg.plan.status === "no_schedule_mode") {
      lines.push(`${legLabel(n, lang)}：${buildNoScheduleModeAnswer(lang, leg.plan)}`);
    } else if (leg.plan.status === "mode_unavailable_offer_alternative") {
      lines.push(`${legLabel(n, lang)}：${buildModeOfferAnswer(lang, leg.plan)}`);
    } else {
      lines.push(`${legLabel(n, lang)}：${blockedReason(fromName, toName, leg.plan, lang)}`);
    }
  });

  if (multi.overallStatus === "blocked") {
    // mode_unavailable_offer_alternative／no_schedule_mode 那段已經給了自己的建議或提問，不用再疊加通用的聯繫提示；
    // 真的完全查不到班次（no_route／missed_last／outside_period）才問要不要提供包車司機聯絡方式
    const blockingStatus = multi.legs[multi.legs.length - 1]?.plan.status;
    if (blockingStatus === "no_route" || blockingStatus === "missed_last" || blockingStatus === "outside_period") {
      lines.push(driverOfferQuestion(lang));
    } else if (blockingStatus !== "mode_unavailable_offer_alternative" && blockingStatus !== "no_schedule_mode") {
      lines.push(contactAdviceLine(lang));
    }
  } else {
    const lastLeg = multi.legs[multi.legs.length - 1];
    if (lastLeg && lastLeg.toKey === HOMESTAY_STOP) lines.push(WALK_NOTE[lang]);
  }

  if (ctx.mentionedLongtouping) lines.push(PICKUP_REMINDER[lang]);

  return lines.filter(Boolean).join("\n\n") + "\n\n" + DISCLAIMER[lang];
}
