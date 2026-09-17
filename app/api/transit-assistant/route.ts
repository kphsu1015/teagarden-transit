import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "../../lib/transit-assistant/rate-limit";
import { getCachedParse, setCachedParse, makeParseCacheKey } from "../../lib/transit-assistant/cache";
import { isOpenAIConfigured, parseTravelerQuery, type ParsedQuery } from "../../lib/transit-assistant/openai-parser";
import { resolveLocationText } from "../../lib/transit-assistant/locations";
import { planTrip, planMultiLegTrip, resolveSearchWindow, isNoServiceStatus } from "../../lib/transit-assistant/route-planner";
import { buildAnswer, buildMultiLegAnswer, buildDriverContactAnswer, buildDriverDeclineAnswer } from "../../lib/transit-assistant/answer-builder";
import { mergeConversationTurn } from "../../lib/transit-assistant/merge";
import { getTaipeiNow, epochMsToTaipeiIsoString } from "../../lib/transit-assistant/taipei-time";
import type { SearchWindow } from "../../lib/transit-assistant/route-planner";
import {
  sanitizeConversationState,
  buildContextForAI,
  buildUpdatedConversationState,
  buildMergeDebugInfo,
  type ConversationState,
  type RouteSegment,
} from "../../lib/transit-assistant/conversation";
import { HOMESTAY_STOP } from "../../lib/bus-data";
import type { Lang } from "../../lib/i18n";
import type { ModedTrip } from "../../lib/transit-assistant/transport";

export const runtime = "nodejs";

const MAX_MESSAGE_CHARS = 500;
const VALID_LANGS: Lang[] = ["zh", "zh-CN", "en"];

const CLARIFY_NO_ORIGIN: Record<Lang, string> = {
  zh: "您好，方便告訴我們您目前在哪個城市或車站嗎？我們好幫您安排接下來的交通方式。",
  "zh-CN": "您好，方便告诉我们您目前在哪个城市或车站吗？我们好帮您安排接下来的交通方式。",
  en: "Hi there! Could you let us know which city or station you're currently at, so we can help plan your route?",
};
const CLARIFY_NO_DEST: Record<Lang, string> = {
  zh: "請問您是要前往民宿，還是要從民宿出發到其他地方呢？",
  "zh-CN": "请问您是要前往民宿，还是要从民宿出发到其他地方呢？",
  en: "Just to check — are you heading to the B&B, or heading out from the B&B somewhere else?",
};
const CLARIFY_UNKNOWN_PLACE: Record<Lang, string> = {
  zh: "不好意思，這個地點我們暫時沒辦法辨識呢。方便的話，可以說「嘉義高鐵站」「嘉義火車站」「奮起湖」「阿里山」「龍頭站/龍頭坪站」或「茶香花園民宿」這些地方嗎？",
  "zh-CN": "不好意思，这个地点我们暂时没办法辨识呢。方便的话，可以说「嘉义高铁站」「嘉义火车站」「奋起湖」「阿里山」「龙头站/龙头坪站」或「茶香花园民宿」这些地方吗？",
  en: "Sorry, we're not able to recognize that place just yet. Could you use one of these instead: THSR Chiayi Station, Chiayi Railway Station, Fenqihu, Alishan, Longtou/Longtouping Station, or Tea Garden B&B?",
};
const GENERIC_ERROR: Record<Lang, string> = {
  zh: "不好意思，我們這邊暫時有點小狀況，麻煩您稍後再試一次，或是使用下方的班次查詢功能，謝謝您的耐心。",
  "zh-CN": "不好意思，我们这边暂时有点小状况，麻烦您稍后再试一次，或是使用下方的班次查询功能，谢谢您的耐心。",
  en: "Sorry, we're having a brief hiccup on our end — please try again in a moment, or use the schedule finder below. Thanks so much for your patience!",
};

const isDev = process.env.NODE_ENV === "development";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function normalizeLang(v: unknown): Lang {
  return typeof v === "string" && (VALID_LANGS as string[]).includes(v) ? (v as Lang) : "zh";
}

interface QuickBody {
  kind: "quick";
  originText: unknown;
  destText: unknown;
  lang: unknown;
}
interface TextBody {
  kind: "text";
  message: unknown;
  conversationState?: unknown;
}

function isQuickBody(b: unknown): b is QuickBody {
  return typeof b === "object" && b !== null && (b as { kind?: unknown }).kind === "quick";
}
function isTextBody(b: unknown): b is TextBody {
  return typeof b === "object" && b !== null && (b as { kind?: unknown }).kind === "text";
}

function windowDebugView(window: SearchWindow) {
  return {
    lowerISO: epochMsToTaipeiIsoString(window.lowerEpochMs),
    upperISO: window.upperEpochMs != null ? epochMsToTaipeiIsoString(window.upperEpochMs) : null,
  };
}

function toRouteSegment(fromKey: string, toKey: string, trip: ModedTrip): RouteSegment {
  return {
    mode: trip.mode,
    fromKey,
    toKey,
    routeLabel: trip.routeLabel,
    departTime: trip.departTime,
    arriveTime: trip.arriveTime,
    fareFull: trip.fareFull,
    fareHalf: trip.fareHalf,
  };
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: GENERIC_ERROR.zh }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }

    const now = getTaipeiNow();

    // ---- 快速地點按鈕 / GPS 最近站：完全不呼叫 OpenAI ----
    if (isQuickBody(body)) {
      const originText = typeof body.originText === "string" ? body.originText.slice(0, 100) : "";
      const destText = typeof body.destText === "string" ? body.destText.slice(0, 100) : HOMESTAY_STOP;
      const lang = normalizeLang(body.lang);

      const origin = resolveLocationText(originText);
      const dest = resolveLocationText(destText);
      if (!origin || !dest) {
        return NextResponse.json({ ok: false, error: "Unknown location." }, { status: 400 });
      }

      const plan = planTrip({
        originKey: origin.key,
        destKey: dest.key,
        dateISO: now.dateISO,
        window: resolveSearchWindow(now.dateISO, null, null),
        transportMode: "bus",
        includeDebugTrace: isDev,
      });
      const reply = buildAnswer({
        lang,
        plan,
        mentionedLongtouping: origin.mentionedLongtouping || dest.mentionedLongtouping,
        preference: null,
        passengers: null,
        largeLuggage: null,
      });

      // 快速按鈕本身就是完整、無歧義的一輪查詢，一樣要更新對話狀態，讓後續「回來呢／晚一班」這類追問能延續下去
      const succeeded = plan.status === "ok" && plan.nextTrip;
      const nextConversationState: ConversationState = {
        requestedDate: now.dateISO,
        requestedTime: null,
        timePeriod: null,
        origin: origin.key,
        waypoints: [],
        destination: dest.key,
        transportMode: "bus",
        currentLocation: succeeded ? dest.key : null,
        lastArrivalTime: succeeded ? plan.nextTrip!.arriveTime : null,
        lastDepartureTime: succeeded ? plan.nextTrip!.departTime : null,
        lastRouteSegments: succeeded ? [toRouteSegment(origin.key, dest.key, plan.nextTrip!)] : [],
        language: lang,
        pendingClarification: null,
        awaitingDriverOfferResponse: isNoServiceStatus(plan),
      };

      const quickDebug = isDev ? { taipeiNow: now, window: windowDebugView(plan.window), trace: plan.debugTrace } : undefined;
      return NextResponse.json({ ok: true, reply, usedAI: false, usage: null, debug: quickDebug, conversationState: nextConversationState });
    }

    // ---- 自由文字：需要 OpenAI 理解語意 ----
    if (isTextBody(body)) {
      const raw = typeof body.message === "string" ? body.message : "";
      const message = raw.trim();
      const charCount = Array.from(message).length;

      if (charCount === 0) {
        return NextResponse.json({ ok: false, error: "Empty message." }, { status: 400 });
      }
      if (charCount > MAX_MESSAGE_CHARS) {
        return NextResponse.json({ ok: false, error: `Message too long (max ${MAX_MESSAGE_CHARS} characters).` }, { status: 400 });
      }

      // conversationState 來自瀏覽器，一律視為不可信：重新驗證格式、地點是否存在、字串長度、陣列筆數，
      // 驗證失敗的欄位直接拿掉，不會讓整個請求失敗，也絕不會被拿去當作班次事實使用。
      const state = sanitizeConversationState(body.conversationState);
      const contextJson = buildContextForAI(state);

      if (!isOpenAIConfigured()) {
        return NextResponse.json({ ok: false, aiUnavailable: true }, { status: 200 });
      }

      let parsed: ParsedQuery;
      let usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
      try {
        const cacheKey = makeParseCacheKey(message, now.dateISO, contextJson);
        const cached = getCachedParse(cacheKey);
        if (cached) {
          parsed = cached.parsed;
          usage = null; // 快取命中，沒有實際新增 token 用量
        } else {
          const outcome = await parseTravelerQuery(message, now.dateISO, now.timeHHMM, contextJson);
          setCachedParse(cacheKey, outcome);
          parsed = outcome.parsed;
          usage = outcome.usage;
        }
      } catch (err) {
        console.error("[transit-assistant] OpenAI parse failed:", err instanceof Error ? err.message : err);
        return NextResponse.json({ ok: false, aiUnavailable: true }, { status: 200 });
      }

      const lang = normalizeLang(parsed.language);
      if (isDev) console.debug("[transit-assistant] AI parsed:", JSON.stringify(parsed));

      // 旅客直接主動問「有沒有司機電話／可以包車嗎」：不管有沒有給出發地/目的地，直接回覆聯絡方式，
      // 不用先跑一次查無班次的流程、也不用先問是/否 —— 這是旅客自己主動要的，不是被動被問到才決定
      if (parsed.directDriverInquiry) {
        const reply = buildDriverContactAnswer(lang);
        const s: ConversationState = { ...state, language: lang, awaitingDriverOfferResponse: false };
        const debug = isDev ? { taipeiNow: now, previousConversationState: state, parsed } : undefined;
        return NextResponse.json({ ok: true, reply, usedAI: true, usage, debug, conversationState: s });
      }

      // 上一輪剛問過「要不要提供包車司機聯絡方式」，且這輪是明確的是/否回答：直接回覆，不重新查一次路線
      // （state.awaitingDriverOfferResponse 是 TS 端的把關，AI 誤判 driverContactConsent 也不會被誤用）
      if (state.awaitingDriverOfferResponse && parsed.driverContactConsent) {
        const reply = parsed.driverContactConsent === "yes" ? buildDriverContactAnswer(lang) : buildDriverDeclineAnswer(lang);
        const s: ConversationState = { ...state, language: lang, awaitingDriverOfferResponse: false };
        const debug = isDev ? { taipeiNow: now, previousConversationState: state, parsed } : undefined;
        return NextResponse.json({ ok: true, reply, usedAI: true, usage, debug, conversationState: s });
      }

      // 不管這一輪最後成功算出行程、還是又卡在澄清問題，都要先把「這輪已經確定的欄位」併回狀態 ——
      // 只合併真正有值的欄位（null/undefined/空字串一律忽略、沿用舊值），這樣「已經問出來的出發地、
      // 目的地、日期、交通工具」才不會因為這輪只補了一個時間，就被整個清空、下一輪又重問一次。
      const mergedState = buildUpdatedConversationState(parsed, state, lang);
      const mergeDebugInfo = isDev ? buildMergeDebugInfo(parsed, state, mergedState) : undefined;
      const debugBase = isDev
        ? { taipeiNow: now, previousConversationState: state, pendingClarification: mergedState.pendingClarification, parsed, mergedConversationState: mergedState, mergeDebugInfo }
        : undefined;

      if (parsed.needsClarification) {
        const question =
          typeof parsed.clarificationQuestion === "string" && parsed.clarificationQuestion.trim()
            ? parsed.clarificationQuestion.trim()
            : CLARIFY_NO_ORIGIN[lang];
        return NextResponse.json({ ok: true, reply: question, usedAI: true, usage, debug: debugBase, conversationState: mergedState });
      }

      // 把這一輪 AI 解析結果和上一輪 conversationState 合併成實際查詢條件（新訊息優先，沒提到的才沿用上一輪）
      const merged = mergeConversationTurn(parsed, state, now);
      if (merged.kind === "need_origin") {
        const s: ConversationState = { ...mergedState, pendingClarification: "origin" };
        return NextResponse.json({ ok: true, reply: CLARIFY_UNKNOWN_PLACE[lang], usedAI: true, usage, debug: debugBase, conversationState: s });
      }
      if (merged.kind === "unknown_place") {
        const s: ConversationState = {
          ...mergedState,
          pendingClarification: merged.field === "waypoint" ? null : merged.field,
        };
        return NextResponse.json({ ok: true, reply: CLARIFY_UNKNOWN_PLACE[lang], usedAI: true, usage, debug: debugBase, conversationState: s });
      }
      if (merged.kind === "need_destination") {
        const s: ConversationState = { ...mergedState, pendingClarification: "destination" };
        return NextResponse.json({ ok: true, reply: CLARIFY_NO_DEST[lang], usedAI: true, usage, debug: debugBase, conversationState: s });
      }
      const { origin, dest, waypoints, dateISO, requestedTime, timePeriod, window, transportMode, mentionedLongtouping } = merged;
      const waypointKeys = waypoints.map((w) => w.key);

      const debugWindowInfo = isDev
        ? {
            requestedDate: dateISO,
            requestedTime,
            timePeriod,
            transportMode,
            allowAlternativeModes: parsed.allowAlternativeModes,
            excludePreviousRecommendation: parsed.excludePreviousRecommendation,
            window: windowDebugView(window),
          }
        : undefined;

      // ---- 多段行程：有中途點時，逐段規劃（第二段以後要看前一段實際抵達時間，絕不再用現在時間或原始時段）----
      if (waypointKeys.length > 0) {
        const stopsInOrder = [origin.key, ...waypointKeys, dest.key];
        const multi = planMultiLegTrip(stopsInOrder, dateISO, window, transportMode, isDev);
        const reply = buildMultiLegAnswer({ lang, multi, mentionedLongtouping });

        const multiSucceeded = multi.overallStatus === "ok";
        const lastLeg = multi.legs[multi.legs.length - 1];
        const nextConversationState: ConversationState = {
          requestedDate: dateISO,
          requestedTime,
          timePeriod,
          origin: origin.key,
          waypoints: waypointKeys,
          destination: dest.key,
          transportMode,
          currentLocation: multiSucceeded ? dest.key : state.currentLocation,
          lastArrivalTime: multiSucceeded && lastLeg?.plan.nextTrip ? lastLeg.plan.nextTrip.arriveTime : state.lastArrivalTime,
          lastDepartureTime: multiSucceeded && lastLeg?.plan.nextTrip ? lastLeg.plan.nextTrip.departTime : state.lastDepartureTime,
          lastRouteSegments: multiSucceeded
            ? multi.legs.filter((l) => l.plan.nextTrip).map((l) => toRouteSegment(l.fromKey, l.toKey, l.plan.nextTrip!))
            : state.lastRouteSegments,
          language: lang,
          pendingClarification: null,
          awaitingDriverOfferResponse: lastLeg ? isNoServiceStatus(lastLeg.plan) : false,
        };

        const debug = isDev
          ? {
              ...debugBase,
              ...debugWindowInfo,
              legs: multi.legs.map((l) => ({
                fromKey: l.fromKey,
                toKey: l.toKey,
                status: l.plan.status,
                window: windowDebugView(l.plan.window),
                trace: l.plan.debugTrace,
              })),
            }
          : undefined;
        return NextResponse.json({ ok: true, reply, usedAI: true, usage, debug, conversationState: nextConversationState });
      }

      // ---- 單段行程 ----
      const plan = planTrip({ originKey: origin.key, destKey: dest.key, dateISO, window, transportMode, includeDebugTrace: isDev });
      const reply = buildAnswer({
        lang,
        plan,
        mentionedLongtouping,
        preference: parsed.preference,
        passengers: typeof parsed.passengers === "number" ? parsed.passengers : null,
        largeLuggage: typeof parsed.largeLuggage === "boolean" ? parsed.largeLuggage : null,
      });

      const succeeded = plan.status === "ok" && plan.nextTrip;
      const nextConversationState: ConversationState = {
        requestedDate: dateISO,
        requestedTime,
        timePeriod,
        origin: origin.key,
        waypoints: [],
        destination: dest.key,
        transportMode,
        currentLocation: succeeded ? dest.key : state.currentLocation,
        lastArrivalTime: succeeded ? plan.nextTrip!.arriveTime : state.lastArrivalTime,
        lastDepartureTime: succeeded ? plan.nextTrip!.departTime : state.lastDepartureTime,
        lastRouteSegments: succeeded ? [toRouteSegment(origin.key, dest.key, plan.nextTrip!)] : state.lastRouteSegments,
        language: lang,
        pendingClarification: null,
        awaitingDriverOfferResponse: isNoServiceStatus(plan),
      };

      const debug = isDev ? { ...debugBase, ...debugWindowInfo, trace: plan.debugTrace } : undefined;
      return NextResponse.json({ ok: true, reply, usedAI: true, usage, debug, conversationState: nextConversationState });
    }

    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  } catch (err) {
    console.error("[transit-assistant] Unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: GENERIC_ERROR.zh }, { status: 500 });
  }
}
